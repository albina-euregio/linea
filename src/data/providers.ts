import { FeatureCollectionSchema, type Feature, type FeatureCollection } from "../schema/listing";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider, ProviderIdentifier } from "./provider";
import { fetchSMET } from "./smet-data";
import type { StationData } from "./station-data";
import { SLFDataProvider } from "./slf-data";
import { BellunoDataProvider } from "./belluno-data";
import { GeoSphereDataProvider } from "./geosphere-data";
export { SLFDataProvider } from "./slf-data";
export { BellunoDataProvider } from "./belluno-data";
export { GeoSphereDataProvider } from "./geosphere-data";

export class SmetDataProvider implements LineaDataProvider {
  constructor(
    public readonly dataProviderID: ProviderIdentifier,
    public readonly regions: string[],
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
      f.properties.dataProviderID = this.dataProviderID;
      f.properties.dataURLs = this.smetURLs(f.properties.shortName || f.id);
    });
    return collection;
  }

  fetchStationData(_: Feature, dataURL: URL): Promise<StationData> {
    return fetchSMET(dataURL.toString());
  }
}

export class MultiDataProvider implements LineaDataProvider {
  readonly regions: string[];
  constructor(
    readonly dataProviderID: string,
    readonly providers: LineaDataProvider[],
  ) {
    this.regions = providers.flatMap((p) => p.regions);
  }

  filtered(predicate: (p: LineaDataProvider) => boolean): MultiDataProvider {
    const providers = this.providers.filter(predicate);
    const dataProviderID = providers.map((p) => p.dataProviderID).join();
    return new MultiDataProvider(dataProviderID, providers);
  }

  async fetchStationListing(): Promise<FeatureCollection> {
    const collections$ = this.providers.flatMap((c) => c.fetchStationListing());
    const collections = await Promise.all(collections$);
    const features = collections.flatMap((f) => f.features);
    return { type: "FeatureCollection", features };
  }

  fetchStationData(feature: Feature, dataURL: URL): Promise<StationData> {
    const dataProviderID = feature.properties.dataProviderID;
    const provider = this.providers.find((p) => p.dataProviderID === dataProviderID);
    if (!provider) {
      throw new Error("No provider known for dataProviderID=" + dataProviderID);
    }
    return provider.fetchStationData(feature, dataURL);
  }
}

export const PROVIDERS = new MultiDataProvider("LINEA", [
  new SmetDataProvider(
    "ALBINA",
    ["AT-07", "IT-32-BZ", "IT-32-TN"],
    "https://static.avalanche.report/weather_stations/linea.geojson.gz",
    (id) => [
      `https://api.avalanche.report/lawine/grafiken/smet/woche/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/winter/${id}.smet.gz`,
      `https://api.avalanche.report/lawine/grafiken/smet/all/${id}.smet.gz`,
    ],
  ),

  new SmetDataProvider(
    "AT-02",
    ["AT-02"],
    "https://smet.hydrographie.info/stations_ktn_destiny.geojson",
    (id) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
  ),

  new SmetDataProvider(
    "AT-05",
    ["AT-05"],
    "https://www.salzburg.gv.at/lawine/smet/linea.geojson",
    (id) => [
      `https://www.salzburg.gv.at/lawine/smet/woche/${id}.smet.gz`,
      `https://www.salzburg.gv.at/lawine/smet/winter/${id}.smet.gz`,
    ],
  ),

  new SmetDataProvider(
    "OEBB",
    ["AT-02','AT-03' ,'AT-04' ,'AT-05' ,'AT-06' ,'AT-07' ,'AT-08"],
    "https://oebb.infra.tbbm.at/smet/linea.geojson",
    (id) => [
      `https://oebb.infra.tbbm.at/smet/woche/${id}.smet.gz`,
      `https://oebb.infra.tbbm.at/smet/winter/${id}.smet.gz`,
    ],
  ),

  new SmetDataProvider(
    "AT-06",
    ["AT-06"],
    "https://lawinen.at/smet/stm/stations_stm.geojson",
    (id) => [`https://lawinen.at/smet/stm/woche/${id}.smet.gz`],
  ),

  new SmetDataProvider(
    "AT-03",
    ["AT-03"],
    "https://lawinen.at/smet/noe/stations_noe.geojson",
    (id) => [`https://lawinen.at/smet/noe/woche/${id}.smet.gz`],
  ),

  new SmetDataProvider(
    "AT-04",
    ["AT-04"],
    "https://lawinen.at/smet/ooe/stations_ooe.geojson",
    (id) => [`https://lawinen.at/smet/ooe/woche/${id}.smet.gz`],
  ),

  new SmetDataProvider(
    "AT-08",
    ["AT-08"],
    "https://lawinen.at/smet/vor/stations_vor.geojson",
    (id) => [`https://lawinen.at/smet/vor/woche/${id}.smet.gz`],
  ),

  new SmetDataProvider(
    "IT-36",
    ["IT-36"],
    "https://smet.hydrographie.info/stations_fvg_destiny.geojson",
    (id) => [
      `https://smet.hydrographie.info/${id}.smet`,
      `https://smet.hydrographie.info/${id}_6m.smet`,
    ],
  ),

  new SmetDataProvider(
    "DE-BY",
    ["DE-BY"],
    "https://lawinen.at/smet/bay/stations_bay.geojson",
    (id) => [`https://lawinen.at/smet/bay/woche/${id}.smet.gz`],
  ),

  new SmetDataProvider("SI", ["SI"], "https://lawinen.at/smet/slo/stations_slo.geojson", (id) => [
    `https://lawinen.at/smet/slo/woche/${id}.smet.gz`,
  ]),

  new GeoSphereDataProvider(),

  new SLFDataProvider(),

  new BellunoDataProvider(),
]);
