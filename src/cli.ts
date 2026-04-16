import { fetchAll } from "./data/fetch-listing";
import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { FeatureCollectionSchema } from "./schema/listing";

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
  spawnSync("gzip", ["--force", "--best", "--keep", output]);
  spawnSync("zstd", ["--force", "-19", output]);
}
