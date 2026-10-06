import { execSync } from "node:child_process";
import { defineConfig } from "vite-plus";
import packageJson from "../../package.json" with { type: "json" };

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
    env: {
      VITE_GIT_DESCRIBE: execSync("git describe --always").toString().trim(),
      VITE_NAME: packageJson.name,
      VITE_HOMEPAGE: packageJson.homepage,
      VITE_LICENSE: packageJson.license,
    },
  },
});
