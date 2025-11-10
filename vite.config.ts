import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  server: {
	  host: true,
	  port: 5173,
  },
  build: {
    lib: {
      entry: "./src/main.ts",
      formats: ["es"],
    },
    sourcemap: true,
  },
});
