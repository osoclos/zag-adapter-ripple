import { defineConfig, type Plugin } from "vite";

import { ripple as pluginRipple } from "@ripple-ts/vite-plugin";
import pluginTailwind from "@tailwindcss/vite";

const pluginDevTransform = (): Plugin => {
    return {
        name: "parse-dev-html",
        apply: "serve",

        transformIndexHtml: (html: string): string => {
            return html
                .replace("style-src   'self';", "style-src   'self' 'unsafe-inline';")
                .replace("worker-src  'self';", "worker-src  'self' blob:;");
        }
    }
};

export default defineConfig({
    plugins: [
        pluginRipple(),
        pluginTailwind({ optimize: { minify: true } }),

        pluginDevTransform()
    ]
});
