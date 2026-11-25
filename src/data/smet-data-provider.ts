import * as v from "valibot";
import { FeatureCollectionSchema, type Feature, type FeatureCollection } from "../schema/listing";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider, ProviderIdentifier } from "./provider";
import { fetchSMET } from "./smet-data";
import type { StationData } from "./station-data";

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
      response.headers.get("Content-Type") === "application/gzip" ||
      response.headers.get("Content-Type") === "application/x-gzip"
    ) {
      const blob = await response.blob();
      const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
      response = new Response(stream);
    }
    const json = await response.json();

    const collection = v.parse(FeatureCollectionSchema, this.mapGeoJSON(json));
    collection.features.forEach((f) => {
      f.properties.dataProviderID = this.dataProviderID;
      f.properties.dataURLs = this.smetURLs(f.properties.shortName || f.id);
    });
    return collection;
  }

  /** Converts a provider-specific listing into the LINEA GeoJSON schema before validation. */
  protected mapGeoJSON(json: unknown): unknown {
    return json;
  }

  fetchStationData(f: Feature, dataURLsIndex: number): Promise<StationData> {
    const dataURL = f.properties.dataURLs[dataURLsIndex];
    return fetchSMET(dataURL);
  }
}
