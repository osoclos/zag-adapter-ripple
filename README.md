# zag-adapter-ripple

A [Zag.js](https://zagjs.com/) framework adapter for [Ripple.ts (v0.3.0)](https://www.ripple-ts.com/)

## Description

This is an updated and reworked fork of [@anubra266](https://github.com/anubra266)'s [zag-ripple](https://github.com/anubra266/zag-ripple) package, which only supports up to Ripple.ts v0.2.0, with changes adapted from its only other fork by [ethan-huo](https://github.com/ethan-huo).

## Usage

Here is an example of the [tooltip](https://zagjs.com/components/react/tooltip) component from Zag.js.

``` tsrx
import { track } from "ripple";
import { useMachine, normalizeProps } from "zag-adapter-ripple";

import * as tooltip from "@zag-js/tooltip";

export function Tooltip() @{
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
```

### Reading documentation from Zag.js

Since there are no provided examples on how to use Zag.js properly with Ripple.ts, we must therefore use another framework to base our usage on. After careful research, [Solid.js](https://www.solidjs.com/) seems to be the closest one (only needing to replace `createMemo` to Ripple.ts' equivalent `track` function when connecting to the service).
