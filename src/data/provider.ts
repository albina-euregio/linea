import type { StationData } from "../data/station-data";
import type { Feature, FeatureCollection } from "../schema/listing";

export interface LineaDataProvider {
  readonly id: string;
  readonly regions: string[];
  fetchStationListing(): Promise<FeatureCollection>;
  fetchStationData(feature: Feature, dataURL: URL): Promise<StationData>;
}
