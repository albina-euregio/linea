import { fetchAll } from "./src/data/fetch-listing";
import { writeFile } from "node:fs/promises";
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
  await writeFile("LINEA.json", json, { encoding: "utf8" });
}
