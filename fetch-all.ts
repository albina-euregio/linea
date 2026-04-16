import { fetchAll } from "./src/data/fetch-listing";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { FeatureCollectionSchema } from "./src/schema/listing";

main();

async function main() {
  const features = await fetchAll();
  const json = JSON.stringify(
    {
      type: "FeatureCollection",
      features,
    },
    undefined,
    2,
  );
  FeatureCollectionSchema.parse(JSON.parse(json));
  const output = "linea.geojson";
  await writeFile(output, json, { encoding: "utf8" });
  const result = spawnSync("zstd", ["--force", "-19", output], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`zstd failed with status ${result.status}`);
  }
}
