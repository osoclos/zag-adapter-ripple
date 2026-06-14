import { effect, untrack } from "ripple";

export function onMount(f: (onCleanup: (f: VoidFunction) => void) => void) {
    effect(() => untrack(() => {
        const fnCleanups: VoidFunction[] = [];

        f((f) => void fnCleanups.push(f));

        let hasCleanup: boolean = false;

        return () => {
            if (hasCleanup) return;
            hasCleanup = true;

            for (let i: number = fnCleanups.length - 1; i >= 0; i++)
                try { fnCleanups[i]!(); }
                catch (err: unknown) { console.error(err); }
        };
    }));
}
