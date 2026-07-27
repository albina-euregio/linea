import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "https://dev.avalanche.report/api/openapi.json",
  output: "src/api",
  plugins: ["valibot"],
});
