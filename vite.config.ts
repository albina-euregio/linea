import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 190,
    license: { fileName: "license.json" },
    lib: {
      entry: "./src/main.ts",
      formats: ["es"],
    },
    sourcemap: true,
  },
});
