import { FeatureCollectionSchema, type Feature, type FeatureCollection } from "../schema/listing";
import * as geosphere from "./geosphere-data";
import * as slf from "./slf-data";
import * as belluno from "./belluno-data";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider } from "./provider";
import { fetchSMET } from "./smet-data";
import type { StationData } from "./station-data";

export class SmetDataProvider implements LineaDataProvider {
  constructor(
    public regions: string[],
    public geojsonURL: string,
    public smetURLs: (id: string) => string[],
  ) {}

  async fetchStationListing(): Promise<FeatureCollection> {
    let response = await fetchOrThrow(this.geojsonURL);
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

    const collection = FeatureCollectionSchema.parse(json);
    collection.features.forEach((f) => {
      f.properties.dataURLs = this.smetURLs(f.properties.shortName || f.id);
    });
    return collection;
  }

  fetchStationData(_: Feature, dataURL: URL): Promise<StationData> {
    return fetchSMET(dataURL.toString());
  }
}

const PROVIDERS: LineaDataProvider[] = [
  new SmetDataProvider(
    ["AT-07", "IT-32-BZ", "IT-32-TN"],
    "https://static.avalanche.report/weather_stations/linea.geojson.gz",
    (id) => [
      `https://api.avalanche.report/lawine/grafiken/smet/woche/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/winter/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/all/${id}.smet.gz`,
    ],
  ),

  new SmetDataProvider(
    ["AT-02"],
    "https://smet.hydrographie.info/stations_ktn_destiny.geojson",
    (id) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
  ),

  new SmetDataProvider(["AT-05"], "https://www.salzburg.gv.at/lawine/smet/linea.geojson", (id) => [
    `https://www.salzburg.gv.at/lawine/smet/woche/${id}.smet.gz`,
    `https://www.salzburg.gv.at/lawine/smet/winter/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["OEBB"], "https://oebb.infra.tbbm.at/smet/linea.geojson", (id) => [
    `https://oebb.infra.tbbm.at/smet/woche/${id}.smet.gz`,
    `https://oebb.infra.tbbm.at/smet/winter/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["AT-06"], "https://lawinen.at/smet/stm/stations_stm.geojson", (id) => [
    `https://lawinen.at/smet/stm/woche/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["AT-03"], "https://lawinen.at/smet/noe/stations_noe.geojson", (id) => [
    `https://lawinen.at/smet/noe/woche/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["AT-04"], "https://lawinen.at/smet/ooe/stations_ooe.geojson", (id) => [
    `https://lawinen.at/smet/ooe/woche/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["AT-08"], "https://lawinen.at/smet/vor/stations_vor.geojson", (id) => [
    `https://lawinen.at/smet/vor/woche/${id}.smet.gz`,
  ]),

  new SmetDataProvider(
    ["IT-36"],
    "https://smet.hydrographie.info/stations_fvg_destiny.geojson",
    (id) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
  ),

  new SmetDataProvider(["DE-BY"], "https://lawinen.at/smet/bay/stations_bay.geojson", (id) => [
    `https://lawinen.at/smet/bay/woche/${id}.smet.gz`,
  ]),

  new SmetDataProvider(["SI"], "https://lawinen.at/smet/slo/stations_slo.geojson", (id) => [
    `https://lawinen.at/smet/slo/woche/${id}.smet.gz`,
  ]),

  // FIXME
  new SmetDataProvider(["CH"], slf.URL.STATIONS, (id) => [
    `${slf.URL.STATION}${id}/measurements?period_in_days=7`,
  ]),

  // FIXME
  new SmetDataProvider(["IT-34"], belluno.URL, (id) => [
    `https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/${id}.csv`,
  ]),
];

export async function fetchAll(
  configPredicate: (c: LineaDataProvider) => boolean = () => true,
): Promise<Feature[]> {
  const collections$ = PROVIDERS.filter((c) => configPredicate(c)).flatMap((c) =>
    c.fetchStationListing(),
  );
  const collections = await Promise.all(collections$);
  return collections.flatMap((f) => f.features);
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

  const json = await response.json();
  const collection = FeatureCollectionSchema.parse(json, { reportInput: true });
  return collection.features.map((f): Feature => {
    f.properties.dataURLs = smet(f.properties.shortName || f.id);
    return f;
  });
}
