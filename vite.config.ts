import { defineConfig, type Plugin } from "vite";
import * as z from "zod";
import { FeatureCollectionSchema as LegacyFeatureCollectionSchema } from "./src/schema/listing-legacy";
import { FeatureCollectionSchema } from "./src/schema/listing";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  legacy: {
    // see https://github.com/t1m0n/air-datepicker/issues/704
    inconsistentCjsInterop: true,
  },
  build: {
    chunkSizeWarningLimit: 190,
    license: { fileName: "license.json" },
    lib: {
      entry: {
        linea: "./src/main.ts",
        "aws-stats": "./src/aws-stats/main.ts",
      },
      formats: ["es"],
      fileName: (format, entryName) => `${entryName}.mjs`,
    },
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
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
  plugins: [
    zodToJsonSchemaPlugin(FeatureCollectionSchema, "listing.schema.json"),
    zodToJsonSchemaPlugin(LegacyFeatureCollectionSchema, "listing-legacy.schema.json"),
  ],
});

function zodToJsonSchemaPlugin(type: z.ZodType, fileName: string): Plugin {
  return {
    name: "zod-to-json-schema",
    apply: "build",
    buildStart() {
      const schema = type.toJSONSchema({
        unrepresentable: "any",
        override: ({ zodSchema, jsonSchema }) => {
          if (zodSchema._zod.def.type === "date") {
            jsonSchema.type = "string";
            jsonSchema.format = "date-time";
          }
        },
      });
      const schemaJson = JSON.stringify(schema, undefined, 2);
      this.emitFile({ type: "asset", fileName, source: schemaJson });
    },
  };
}
