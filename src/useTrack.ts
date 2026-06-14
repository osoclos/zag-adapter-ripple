import type { Params } from "@zag-js/core";
import { isEqual } from "@zag-js/utils";

import { effect } from "ripple";

import { access } from "./utils";

export type TrackParameters = Parameters<Params<{}>["track"]>
export function useTrack(deps: TrackParameters[0], f: TrackParameters[1]) {
    let depsPrev: ReturnType<TrackParameters[0][number]>[] = [];

    let isFirst: boolean = true;
    effect(() => {
        if (isFirst) {
            isFirst = false;

            depsPrev = deps.map((dep) => access(dep));
            return;
        }

        let hasChanged: boolean = false;

        for (let i: number = 0; i < deps.length; i++) {
            if (isEqual(access(deps[i]), depsPrev[i])) continue;

            hasChanged = true;
            break;
        }

        if (hasChanged) {
            depsPrev = deps.map((dep) => access(dep));
            f();
        }
    });
}
