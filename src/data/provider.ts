import z from "zod";
import type { StationData } from "../data/station-data";
import type { Feature, FeatureCollection } from "../schema/listing";

export const ProviderIdentifierSchema = z.string().brand();
export type ProviderIdentifier = z.infer<typeof ProviderIdentifierSchema>;

export interface LineaDataProvider {
  readonly dataProviderID: ProviderIdentifier;
  readonly regions: string[];
  fetchStationListing(): Promise<FeatureCollection>;
  fetchStationData(feature: Feature, dataURLsIndex: number): Promise<StationData>;
}
