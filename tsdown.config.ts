import { defineConfig } from "tsdown";

export default defineConfig({
    entry: "src/index.ts",
    format: "esm",

    fixedExtension: true,
    outExtensions() {
        return {
            js: ".js",
            dts: ".d.ts"
        }
    },

    tsconfig: "tsconfig.lib.json",

    dts: true,
    sourcemap: true,

    clean: true,
    minify: {
        mangle: {
            keepNames: true,
            toplevel: false
        },

        compress: {
            target: ["es2023"],

            sequences: true,
            joinVars: true,

            unused: "keep_assign",

            keepNames: {
                function: true,
                class: true
            },

            dropConsole: false,
            dropDebugger: true
        },

        codegen: { removeWhitespace: true }
    },

    unbundle: true,

    css: { splitting: true },
});
