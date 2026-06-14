import { track } from "ripple";
import { useMachine, normalizeProps } from "zag-adapter-ripple";

import * as tooltip from "@zag-js/tooltip";

export function App() @{
    const service = useMachine(tooltip.machine, { id: "1" });
    const &[api] = track(() => tooltip.connect(service, normalizeProps));

    <>
        <button {...api.getTriggerProps()}>Hover me</button>
        @if (api.open) {
            <div {...api.getPositionerProps()}>
                <div {...api.getContentProps()}>Tooltip</div>
            </div>
        }
    </>
}
