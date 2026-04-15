import { defineConfig, type Plugin } from "vite-plus";

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
  plugins: [zodToJsonSchemaPlugin("listing.schema.json")],
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml", "pnpm-workspace.yaml"],
  },
  staged: {
    "**/*.{js,ts}": "vp lint --fix --max-warnings 0",
    "**/*": "vp fmt --no-error-on-unmatched-pattern",
  },
});

function zodToJsonSchemaPlugin(fileName: string): Plugin {
  return {
    name: "zod-to-json-schema",
    apply: "build",
    async buildStart() {
      const module = await import("./src/schema/listing");
      const schema = module.FeatureCollectionSchema.toJSONSchema({
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
