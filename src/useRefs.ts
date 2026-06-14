import type { BindableRefs } from "@zag-js/core";
import type { PropTypes } from "@zag-js/types";

export interface Ref<T> { current: T; }

export function useRefs<T extends Dict>(refs: T): BindableRefs<{ refs: T; }> {
    const ref: Ref<T> = { current: refs };

    return {
        get<K extends keyof T>(key: K): T[K] {
            return ref.current[key];
        },

        set<K extends keyof T>(key: K, value: T[K]) {
            ref.current[key] = value;
        }
    };
}

type Dict = PropTypes[keyof PropTypes];
