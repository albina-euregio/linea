import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["./cli.ts"],
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
      alwaysBundle: ["xmldom", "temporal-polyfill/global", "valibot"],
      onlyBundle: false,
    },
    dts: false,
    sourcemap: false,
    outDir: "../../dist/",
  },
});
