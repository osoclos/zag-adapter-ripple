import type { Bindable, BindableFn, BindableParams } from "@zag-js/core";
import { isFunction, identity } from "@zag-js/utils";

import { track, effect, untrack, flushSync } from "ripple";

import { onMount } from "./onMount";

export function useBindable<T>(props: () => BindableParams<T>): Bindable<T> {
    const vInitial = props().value ?? props().defaultValue;
    const sValue = track(vInitial); // add signal for internal state

    const sExternal = track(() => props().value !== undefined); // add a derivative for externally-controlled states

    interface Ref<T> { current: T; }

    const refValue: Ref<T> = { current: untrack(() => sValue.value) };
    const refValuePrev: Ref<T | undefined> = { current: undefined };

    const isEqual = props().isEqual ?? Object.is;

    const get = (): T => {
        return sExternal.value ? props().value! : sValue.value;
    };

    const set = (value: T | ((prev: T) => T)) => {
        const execute = props().sync ? flushSync : identity;

        untrack(() => void execute(() => {
            const prev = refValuePrev.current;
            const next = isFunction(value) ? value(refValue.current) : value;

            if (props().debug) console.log(`[bindable > ${props().debug}] setValue`, { next, prev });

            if (!sExternal.value) sValue.value = next;

            // !REDO
            // Synchronously update refs so re-entrant calls (e.g. focus/blur
            // events triggered by .focus() inside an action) see the correct
            // previous value. The async effect also syncs these, but it is
            // batched and won't flush between re-entrant send() calls.
            refValue.current = next;
            refValuePrev.current = next;

            if (!isEqual(next, prev)) props().onChange?.(next, prev);
        }));
    };

    // sync current values and references
    effect(() => {
        const value = get();

        refValue.current = value;
        refValuePrev.current = value;
    });

    return {
        ref: refValue,
        initial: vInitial,

        get,
        set,

        invoke(next: T, prev: T) {
            props().onChange?.(next, prev);
        },

        hash(value: T) {
            return props().hash?.(value) ?? String(value);
        }
    };
}

useBindable.cleanup = (f: VoidFunction) => void onMount((onCleanup) => onCleanup(f));
useBindable.ref = <T>(vDefault: T): ReturnType<BindableFn["ref"]> => {
    let value = vDefault;

    return {
        get() {
            return value;
        },

        set(next: unknown) {
            value = next as T;
        }
    };
};
