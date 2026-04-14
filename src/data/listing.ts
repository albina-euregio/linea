import { FeatureCollectionSchema as LegacyFeatureCollectionSchema } from "../schema/listing-legacy";
import { FeatureCollectionSchema, FeatureSchema } from "../schema/listing";
import * as geosphere from "./geosphere-data";
import { type z } from "zod";

const config = [
  {
    regions: ["AT-07", "IT-32-BZ", "IT-32-TN"],
    smet: (id: string) => [
      `https://api.avalanche.report/lawine/grafiken/smet/woche/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/winter/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/all/${id}.smet.gz`,
    ],
    geojson: "https://static.avalanche.report/weather_stations/linea.geojson",
  },
  {
    regions: ["AT-02"],
    smet: (id: string) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
    geojson: "https://smet.hydrographie.info/stations_ktn_destiny.geojson",
  },
  {
    regions: ["AT-05"],
    smet: (id: string) => [
      `https://www.salzburg.gv.at/lawine/smet/woche/${id}.smet.gz`,
      `https://www.salzburg.gv.at/lawine/smet/winter/${id}.smet.gz`,
    ],
    geojson: "https://www.salzburg.gv.at/lawine/smet/linea.geojson",
  },
  {
    regions: ["OEBB"],
    smet: (id: string) => [
      `https://oebb.infra.tbbm.at/smet/woche/${id}.smet.gz`,
      `https://oebb.infra.tbbm.at/smet/winter/${id}.smet.gz`,
    ],
    geojson: "https://oebb.infra.tbbm.at/smet/linea.geojson",
  },
  {
    regions: ["AT-06"],
    smet: (id: string) => [`https://lawinen.at/smet/stm/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/stm/stations_stm.geojson",
  },
  {
    regions: ["AT-03"],
    smet: (id: string) => [`https://lawinen.at/smet/noe/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/noe/stations_noe.geojson",
  },
  {
    regions: ["AT-04"],
    smet: (id: string) => [`https://lawinen.at/smet/ooe/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/ooe/stations_ooe.geojson",
  },
  {
    regions: ["AT-08"],
    smet: (id: string) => [`https://lawinen.at/smet/vor/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/vor/stations_vor.geojson",
  },
  {
    regions: ["AT-01", "AT-02", "AT-03", "AT-04", "AT-05", "AT-06", "AT-07", "AT-08", "AT-09"],
    smet: (id: string) => {
      const end = Temporal.Now.instant().round("minute");
      const start = end.subtract({ hours: 7 * 24 });
      const params = new URLSearchParams({
        station_ids: id,
        parameters: "TL,FF,FFX,DD,P,RF,SCHNEE,TP",
        output_format: "geojson",
        start: start.toString(),
        end: end.toString(),
      });
      return `https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min?${params}`;
    },
    geojson: "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min/metadata",
  },
  {
    regions: ["DE-BY"],
    smet: (id: string) => [`https://lawinen.at/smet/bay/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/bay/stations_bay.geojson",
  },
  {
    regions: ["SI"],
    smet: (id: string) => [`https://lawinen.at/smet/slo/woche/${id}.smet.gz`],
    geojson: "https://lawinen.at/smet/slo/stations_slo.geojson",
  },
];

type Feature = z.infer<typeof FeatureSchema> & { $smet: string[] };

type FeaturePredicate = (f: Feature, url: URL) => boolean;

type ConfigPredicate = (c: (typeof config)[number]) => boolean;

export async function fetchAll(
  configPredicate: ConfigPredicate = () => true,
  predicate: FeaturePredicate = () => true,
): Promise<Feature[]> {
  const features$ = config
    .filter((c) => configPredicate(c))
    .flatMap((c) => fetchSource(new URL(c.geojson), c.smet, predicate));
  const features = await Promise.all(features$);
  return features.flat();
}

export async function fetchSource(
  geojson: URL,
  smet: (id: string) => string[],
  predicate: FeaturePredicate,
): Promise<Feature[]> {
  const response = await fetch(geojson, { cache: "no-cache" });
  if (!response.ok) {
    console.warn("Not OK", response);
    return [];
  }
  if (response.status === 404) {
    console.warn("HTTP 404", response);
    return [];
  }
  if (
    geojson.toString() ===
    "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min/metadata"
  ) {
    const metadata: geosphere.Metadata = await response.json();
    return metadata.stations
      .map(
        (f): Feature => ({
          ...geosphere.parseGeosphereFeature(f),
          $smet: smet(f.id),
        }),
      )
      .filter((f) => predicate(f, geojson));
  }

  const json = await response.json();
  const isLegacy = geojson.searchParams.get("v") === "legacy";
  const schema = isLegacy ? LegacyFeatureCollectionSchema : FeatureCollectionSchema;
  const collection = schema.parse(json, { reportInput: true });
  return collection.features
    .map(
      (f): Feature => ({
        ...f,
        properties: f.properties!,
        $smet: smet(f.properties.shortName || f.id),
      }),
    )
    .filter((f) => predicate(f, geojson));
}
