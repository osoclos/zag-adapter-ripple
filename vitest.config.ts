import { defineConfig } from "vitest/config";
import { ripple as pluginRipple } from "@ripple-ts/vite-plugin";

export default defineConfig({
    plugins: [pluginRipple()],

    test: {
        globals: true,
        environment: "jsdom",

        retry: 2,

        css: false
    },

    resolve: { conditions: ["development", "browser"] }
});
