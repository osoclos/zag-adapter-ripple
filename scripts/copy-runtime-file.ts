import fs from "fs/promises";

const PATH_SRC_RUNTIME: string = "node_modules/ripple/src/jsx-runtime.d.ts";
const PATH_DST_RUNTIME: string = "src/lib/jsx-runtime.ts";

const PATH_LICENSE: string = "node_modules/ripple/LICENSE";

const mapReplacements: Record<string, string> = {
    "#public": "ripple",
    "import type { Nullable } from '#helpers';": "type Nullable<T> = T | null;"
};

const fLicense = await fs.readFile(PATH_LICENSE, { encoding: "utf-8" });

let fRuntime = `/*\n\n${fLicense}\n*/\n\n` + await fs.readFile(PATH_SRC_RUNTIME, { encoding: "utf-8" });
for (const vSearch in mapReplacements) fRuntime = fRuntime.replaceAll(vSearch, mapReplacements[vSearch]!);

await fs.writeFile(PATH_DST_RUNTIME, fRuntime, { encoding: "utf-8" });
