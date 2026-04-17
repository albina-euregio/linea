import { PROVIDERS } from "../data/providers";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { FeatureCollectionSchema } from "../schema/listing";

main();

async function main() {
  const collection = await PROVIDERS.fetchStationListing();
  const json = JSON.stringify(collection, undefined, 2);
  FeatureCollectionSchema.parse(JSON.parse(json));
  const output = "linea.geojson";
  console.info(`Writing ${collection.features.length} features to ${output}`);
  await writeFile(output, json, { encoding: "utf8" });
  spawnSync("gzip", ["--force", "--best", "--keep", output]);
  spawnSync("zstd", ["--force", "-19", output]);
}
