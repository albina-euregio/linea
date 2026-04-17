import { PROVIDERS } from "../data/providers";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { FeatureCollectionSchema } from "../schema/listing";

main();

async function main() {
  // @ts-ignore// @ts-ignore
  const { DOMParser } = await import("xmldom");
  global.DOMParser = DOMParser;

  const collection = await PROVIDERS.fetchStationListing();
  const json = JSON.stringify(collection, undefined, 2);
  FeatureCollectionSchema.parse(JSON.parse(json));

  const now = Temporal.Now.instant()
    .round({ smallestUnit: "hour", roundingMode: "floor" })
    .toString()
    .slice(0, "2006-01-02T12:00".length)
    .replace("T", "_")
    .replace(":", "-");
  const today = now.slice(0, "2006-01-02".length);

  mkdir(today);
  for (const output of ["linea.geojson", `${today}/${now}_linea.geojson`]) {
    console.info(`Writing ${collection.features.length} features to ${output}`);
    await writeFile(output, json, { encoding: "utf8" });
    spawnSync("gzip", ["--force", "--best", "--keep", output]);
    spawnSync("zstd", ["--force", "-19", output]);
  }
}
