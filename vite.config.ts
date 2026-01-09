import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 190,
    license: { fileName: "license.json" },
    lib: {
      entry: "./src/main.ts",
      formats: ["es", "cjs"],
      name: "@albina-euregio/linea",
    },
    sourcemap: true,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              test: /node_modules\/air-datepicker/,
              name: "air-datepicker",
            },
            {
              test: /node_modules\/temporal-polyfill/,
              name: "temporal-polyfill",
            },
            {
              test: /node_modules\/uplot/,
              name: "uplot",
            },
          ],
        },
      },
    },
  },
});
