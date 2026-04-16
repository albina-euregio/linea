import { FeatureCollectionSchema, type Feature } from "../schema/listing";
import * as geosphere from "./geosphere-data";
import * as slf from "./slf-data";
import * as belluno from "./belluno-data";
import { fetchOrThrow } from "./fetchOrThrow";

type Config = {
  regions: string[];
  smet: (id: string) => string[];
  geojson: string;
};

const config: Config[] = [
  {
    regions: ["AT-07", "IT-32-BZ", "IT-32-TN"],
    smet: (id: string) => [
      `https://api.avalanche.report/lawine/grafiken/smet/woche/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/winter/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/all/${id}.smet.gz`,
    ],
    geojson: "https://static.avalanche.report/weather_stations/linea.geojson.gz",
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
    regions: ["IT-36"],
    smet: (id: string) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
    geojson: "https://smet.hydrographie.info/stations_fvg_destiny.geojson",
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
  {
    regions: ["CH"],
    smet: (id: string) => [`${slf.URL.STATION}${id}/measurements?period_in_days=7`],
    geojson: slf.URL.STATIONS,
  },
  {
    regions: ["IT-34"],
    smet: (id: string) => {
      return [`https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/${id}.csv`];
    },
    geojson: belluno.URL,
  },
];

type ConfigPredicate = (c: (typeof config)[number]) => boolean;

export async function fetchAll(configPredicate: ConfigPredicate = () => true): Promise<Feature[]> {
  const features$ = config
    .filter((c) => configPredicate(c))
    .flatMap((c) => fetchSource(new URL(c.geojson), c.smet));
  const features = await Promise.all(features$);
  return features.flat();
}

export async function fetchSource(
  geojson: URL,
  smet: (id: string) => string[],
): Promise<Feature[]> {
  let response;
  try {
    response = await fetchOrThrow(geojson, { cache: "no-cache" });
  } catch (e) {
    console.warn(e);
    return [];
  }
  if (geojson.toString().startsWith(geosphere.URL)) {
    throw new Error();
  } else if (geojson.toString() === slf.URL.STATIONS) {
    const features = await slf.mapAndFetchCurrentStationData(await response.json());
    const stations = features.map((f): Feature => {
      f.properties.dataURLs = smet(f.id);
      return f;
    });
    return stations;
  } else if (geojson.toString() === belluno.URL) {
    const response = await fetch(belluno.URL);
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Failed to parse ARPAV Belluno XML");
    }
    const stations = Array.from(doc.getElementsByTagName("STAZIONE"));
    return stations.map(belluno.parseBellunoStation).map((f): Feature => {
      f.properties.dataURLs = smet(f.id);
      return f;
    });
  }
  if (
    response.headers.get("Content-Encoding") === "gzip" ||
    response.headers.get("Content-Type") === "application/gzip" ||
    response.headers.get("Content-Type") === "application/x-gzip"
  ) {
    const blob = await response.blob();
    const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
    response = new Response(stream);
  }

  const json = await response.json();
  const collection = FeatureCollectionSchema.parse(json, { reportInput: true });
  return collection.features.map((f): Feature => {
    f.properties.dataURLs = smet(f.properties.shortName || f.id);
    return f;
  });
}
