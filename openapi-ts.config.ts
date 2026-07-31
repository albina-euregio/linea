import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "https://dev.avalanche.report/api/openapi.json",
  output: "src/api",
  parser: {
    filters: {
      // only the schemas imported from src/api/valibot.gen.ts elsewhere in this
      // project (their transitive dependencies are pulled in automatically)
      schemas: {
        include: ["CaamlAvalancheBulletin", "DangerSourceVariant"],
      },
      // we only need the schemas, no operations/responses
      operations: { exclude: ["/.*/"] },
    },
  },
  plugins: ["valibot"],
});
