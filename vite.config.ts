import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    license: { fileName: "license.json" },
    lib: {
      entry: "./src/main.ts",
      formats: ["es"],
    },
    sourcemap: true,
  },
});
