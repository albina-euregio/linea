import type { StationData } from "../data/station-data";
import type { Feature, FeatureCollection } from "../schema/listing";

export interface LineaDataProvider {
  fetchStationListing(): Promise<FeatureCollection>;
  fetchStationData(feature: Feature, dataURL: URL): Promise<StationData>;
}
