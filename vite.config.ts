import { defineConfig, type Plugin } from "vite-plus";
import { toJsonSchema } from "@valibot/to-json-schema";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  legacy: {
    // see https://github.com/t1m0n/air-datepicker/issues/704
    inconsistentCjsInterop: true,
  },
  pack: {
    entry: [
      "src/data/providers.ts",
      "src/schema/listing.ts",
      "src/aws-stats/aws-stats-plot-config.ts",
    ],
    clean: false,
    dts: true,
    sourcemap: true,
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
  plugins: [valibotToJsonSchemaPlugin("listing.schema.json")],
  fmt: {
    ignorePatterns: ["pnpm-lock.yaml", "pnpm-workspace.yaml"],
  },
  staged: {
    "**/*.{js,ts}": "vp lint --fix --max-warnings 0",
    "**/*": "vp fmt --no-error-on-unmatched-pattern",
  },
});

function valibotToJsonSchemaPlugin(fileName: string): Plugin {
  return {
    name: "valibot-to-json-schema",
    apply: "build",
    async buildStart() {
      const module = await import("./src/schema/listing");
      const schema = toJsonSchema(module.FeatureCollectionSchema, {
        errorMode: "ignore",
        typeMode: "input",
      });
      const schemaJson = JSON.stringify(schema, undefined, 2);
      this.emitFile({ type: "asset", fileName, source: schemaJson });
    },
  };
}
