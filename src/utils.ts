import { isObjectLike, isFunction, isPlainObject } from "@zag-js/utils";
import type { Tracked } from "ripple";

export function access<T>(value: T | (() => T)): T {
    return isFunction(value) ? value() : value;
}

export type Compacted<T> =
    Untracked<T> extends infer U ?
        U extends Function
            ? U :
        U extends readonly unknown[]
            ? Array<Compacted<Untracked<U[number]>>> :
        U extends object
            ? { [K in keyof U as U[K] extends undefined ? never : K]: Compacted<Untracked<U[K]>>; }
            : U
        : never;

// !REDO
/**
 * Unwrap tracked values and strip undefined — replaces `compact(access(v))`.
 * Ripple Tracked objects are plain `{}` literals with circular block refs,
 * so the generic `compact` from @zag-js/utils recurses infinitely into them.
 * This function unwraps at the top level AND per-property level.
 */
export function compact<T>(obj: T): Compacted<T> {
    if (!isPlainObject(obj) || obj === undefined || obj === null) return obj as Compacted<T>;

    const res = {} as Compacted<T>;

    const keys = Reflect.ownKeys(obj).filter((key) => typeof key === "string");
    for (const $key of keys) {
        const key = $key as keyof typeof obj;

        const entry = obj[key];

        // unwrap nested tracked values
        const value = isTracked(entry) ? entry.value : entry;
        if (value === undefined) continue;

        (res as Record<PropertyKey, unknown>)[key] = compact(value);
    }

    return res;
}

export type Untracked<T> = T extends Tracked<infer V> ? V : T;

export function isTracked<T>(value: unknown): value is Tracked<T> {
    return (
        isObjectLike(value) &&

        "value" in value &&

        (
            "__v" in value ||
            "v"   in value ||
            "#v"  in value
        )
    );
}
