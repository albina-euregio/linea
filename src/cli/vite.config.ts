import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["./cli.ts"],
    deps: {
      alwaysBundle: ["temporal-polyfill/global", "zod"],
    },
    dts: false,
    sourcemap: false,
    outDir: "../../dist/",
  },
});
