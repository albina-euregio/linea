import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["./cli.ts"],
    deps: {
      alwaysBundle: ["jsdom", "temporal-polyfill/global", "zod"],
      onlyBundle: false,
    },
    dts: false,
    sourcemap: false,
    outDir: "../../dist/",
  },
});
