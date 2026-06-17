import { createScope, ensureStateIndex, findTransition, getExitEnterStates, hasTag, INIT_STATE, MachineStatus, matchesState, resolveStateValue } from "@zag-js/core";
import type { ActionsOrFn, BindableContext, BindableFn, BindableParams, BindableRefs, ChooseFn, ComputedFn, EffectsOrFn, EventObject, GuardFn, Machine, MachineSchema, Params, PropFn, Scope, Service, Transition, ValueOrFn } from "@zag-js/core";

import { ensure, isFunction, isString, toArray, warn } from "@zag-js/utils";

import { track as rTrack, untrack, type Tracked } from "ripple";

import { onMount } from "./onMount";

import { useBindable } from "./useBindable";
import { useRefs } from "./useRefs";
import { useTrack } from "./useTrack";

import { access, compact, isTracked } from "./utils";

/**
  * Hook for Ripple.ts to use Zag.js machines
  *
  * @param machine - The machine to use
  * @param userProps - The user-provided properties to use
  *
  * @returns the service used to connect to the component
  */
export function useMachine<T extends MachineSchema>(machine: Machine<T>, userProps: MaybeTracked<T["props"]>): Service<T> {
    const scope = rTrack(() => {
        const { id, ids, getRootNode } = access(userProps as NonNullable<T["props"]>);
        return createScope({ id, ids, getRootNode: getRootNode as Scope["getRootNode"] });
    });

    const props = rTrack(() => {
        const unwrapped = compact(access(userProps));

        return machine.props?.({
            props: unwrapped as T["props"],
            scope: scope.value
        }) ?? unwrapped;
    });

    interface Ref<T> { current: T; }

    const refEffects: Ref<Map<string, VoidFunction>> = { current: new Map<string, VoidFunction>() };

    const refTransition: Ref<Transition<T, string | undefined> | undefined> = { current: undefined };

    const refEvent: Ref<EventObject> = { current: { type: "" } };
    const refEventPrev: Ref<EventObject | undefined> = { current: undefined };

    const prop = createProp(() => props.value) as PropFn<T>;

    const action = (keys: ActionsOrFn<T> | undefined) => {
        const strs = isFunction(keys) ? keys(getParams()) : keys;
        if (strs === undefined) return;

        const fns = strs.map((s) => {
            const fn = machine.implementations?.actions?.[s];
            if (fn === undefined) warn(`[zag-js] No implementation found for action "${JSON.stringify(s)}"`);

            return fn;
        });

        for (const fn of fns) fn?.(getParams());
    };

    const contextMachine = machine.context?.({
        prop,

        bindable: useBindable as BindableFn,
        get scope() {
            return scope.value;
        },

        flush,

        getContext(): BindableContext<T> {
            return context;
        },

        getComputed(): ComputedFn<T> {
            return computed;
        },

        getRefs(): BindableRefs<T> {
            return refs;
        },

        getEvent(): EventType {
            return getEvent();
        }
    });

    const context: BindableContext<T> = {
        get<K extends keyof T["context"]>(key: K): T["context"][K] {
            return contextMachine?.[key].get()!;
        },

        set<K extends keyof T["context"]>(key: K, value: ValueOrFn<T["context"][K]>) {
            contextMachine?.[key].set(value);
        },

        initial<K extends keyof T["context"]>(key: K): T["context"][K] {
            return contextMachine?.[key].initial!;
        },

        hash<K extends keyof T["context"]>(key: K): string {
            const vCurrent = this.get(key);
            return contextMachine?.[key].hash(vCurrent)!;
        }
    };

    const refs = useRefs<T>((machine.refs?.({ prop, context }) ?? {}) as T) as BindableRefs<T>;

    type EventType = Parameters<Service<T>["send"]>[0];
    const getEvent = (): Params<T>["event"] => ({
        ...refEvent.current,

        current(): EventType {
            return refEvent.current;
        },

        previous(): EventType {
            return refEventPrev.current!;
        }
    });

    const send = (event: EventType) => {
        if (status !== MachineStatus.Started) return;

        refEventPrev.current = refEvent.current;
        refEvent.current = event;

        const stateCurrent = untrack(() => state.get());

        const { transitions, source } = findTransition(machine, stateCurrent, event.type);

        const transition = choose(transitions);
        if (transition === undefined) return;

        // save the current transition state
        refTransition.current = transition;

        const target = resolveTransitionTarget(machine, transition.target ?? stateCurrent, source);

        debug("transition", event.type, transition.target ?? stateCurrent, `(${transition.actions})`);

        const hasChanged = target !== stateCurrent;
        if (hasChanged) state.set(target)
        else if (transition.reenter) state.invoke(stateCurrent, stateCurrent); // "reenter" by resetting the state with the current state
        else action(transition.actions); // call actions assigned for transitions
    };

    const computed: ComputedFn<T> = <K extends keyof T["computed"]>(key: K): T["computed"][K] => {
        ensure(machine.computed, () => `[zag-js] No computed object found on machine`);

        const f = machine.computed[key];
        return f({
            context,

            event: refEvent.current,

            prop,
            refs,

            scope: scope.value,

            computed
        });
    };

    const effect = (keys: EffectsOrFn<T> | undefined): VoidFunction | undefined => {
        const strs = isFunction(keys) ? keys(getParams()) : keys;
        if (strs === undefined) return;

        const fns = strs.map((s) => {
            const fn = machine.implementations?.effects?.[s];
            if (fn === undefined) warn(`[zag-js] No implementation found for action "${JSON.stringify(s)}"`);

            return fn;
        });

        const cleanups: VoidFunction[] = [];
        for (const fn of fns) {
            const cleanup = fn?.(getParams());
            if (cleanup !== undefined) cleanups.push(cleanup);
        }

        return () => void cleanups.forEach((f) => void f?.());
    };

    const state = useBindable<T["state"]>((): BindableParams<T["state"]> => ({
        defaultValue: resolveStateValue(machine, machine.initialState({ prop })),

        onChange(value: T["state"], prev: T["state"] | undefined) {
            const { exiting, entering } = getExitEnterStates(machine, prev, value, refTransition.current?.reenter);

            exiting.forEach((item) => {
                const effect = refEffects.current.get(item.path);
                effect?.();

                refEffects.current.delete(item.path);
            });

            exiting.forEach((item) => void action(item.state?.exit));

            action(refTransition.current?.actions);

            entering.forEach((item) => {
                const cleanup = effect(item.state.effects);
                if (cleanup !== undefined) refEffects.current.set(item.path, cleanup);
            });

            if (prev === INIT_STATE) {
                action(machine.entry);

                const cleanup = effect(machine.effects);
                if (cleanup !== undefined) refEffects.current.set(INIT_STATE, cleanup);
            }

            entering.forEach((item) => void action(item.state.entry));
        }
    }));

    const getState = (): Params<T>["state"] => ({
        ...state,

        matches(...values: T["state"][]) {
            const vCurrent = state.get();
            return values.some((value) => matchesState(vCurrent, value!))
        },

        hasTag(tag: T["tag"]) {
            const vCurrent = state.get();
            return hasTag(machine, vCurrent, tag);
        }
    });

    const choose: ChooseFn<T> = (transitions: MaybeArray<Omit<Transition<T, string>, "target">> | null | undefined): Transition<T> | undefined => {
        return toArray(transitions).find((t) => {
            const result = t.guard;

            return (
                isString(result)
                    ? guard(result) :
                isFunction(result)
                    ? result(getParams())
                    : !result
            );
        });
    };

    const guard = (key: T["guard"] | GuardFn<T>): boolean | undefined => {
        if (isFunction(key)) return key(getParams());
        return machine.implementations?.guards?.[key](getParams());
    };

    const getParams = (): Params<T> => ({
        prop,
        action,

        context,
        refs,

        track: useTrack,

        flush,

        event: getEvent(),

        send,
        computed,

        get scope() {
            return scope.value;
        },

        state: getState(),

        choose,

        guard
    });

    const debug = (...args: unknown[]) => void (machine.debug && console.log(...args));

    let status = MachineStatus.NotStarted;
    onMount((onCleanup) => {
        const hasAlreadyStarted = status === MachineStatus.Started;

        state.invoke(state.initial, INIT_STATE);
        status = MachineStatus.Started;

        debug(hasAlreadyStarted ? "rehydrating..." : "starting...");

        onCleanup(() => {
            debug("unmounting...");

            status = MachineStatus.Stopped;

            const fnsEffect = refEffects.current;
            fnsEffect.forEach((f) => f?.());

            refEffects.current = new Map();
            refTransition.current = undefined;

            action(machine.exit);
        });
    });

    machine.watch?.(getParams());

    return {
        getStatus() {
            return status;
        },

        get state() {
            return getState();
        },

        context,

        send,
        prop,

        get scope() {
            return scope.value;
        },

        computed,
        refs,

        get event() {
            return getEvent();
        }
    };
}

function createProp<T>(value: () => T) {
    return <K extends keyof T>(key: K): T[K] => {
        const vCurrent = value()[key];
        return isTracked(vCurrent) ? vCurrent.value as T[K] : vCurrent;
    };
}

function resolveTransitionTarget<T extends MachineSchema>(machine: Machine<T>, value: T["state"] | string, source?: string): T["state"] {
    const state = String(value);

    if (source === undefined || state.includes(".") || state.startsWith("#")) return resolveStateValue(machine, value, source);

    // Zag 1.41 resolves bare relative targets from ancestors/siblings;
    // parent-local child targets still need the explicit child path for older machine definitions.

    const pathChild = `${source}.${state}`;
    return resolveStateValue(machine, ensureStateIndex(machine).has(pathChild) ? pathChild : value, source);
}

function flush(f: VoidFunction) {
    f();
}

type MaybeTracked<T> = { [K in keyof T]?: T[K] | Tracked<T[K]>; };
type MaybeArray<T> = T | T[];
