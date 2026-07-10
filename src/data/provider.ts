import * as v from "valibot";
import type { StationData } from "../data/station-data";
import type { Feature, FeatureCollection } from "../schema/listing";

export const ProviderIdentifierSchema = v.string()();
export type ProviderIdentifier = v.InferOutput<typeof ProviderIdentifierSchema>;

export interface LineaDataProvider {
  readonly dataProviderID: ProviderIdentifier;
  readonly regions: string[];
  fetchStationListing(): Promise<FeatureCollection>;
  fetchStationData(feature: Feature, dataURLsIndex: number): Promise<StationData>;
}
