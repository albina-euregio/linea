import { SizedAvalancheObservations, TriggeredAvalancheObservations } from "./datastore";

/**
 * Observation data models
 */

export class Observation {
  public id: string;
  public source: string;
  public type: string;
  public region?: string;

  public geometry: {
    type: string;
    coordinates: number[];
  };

  public properties: {
    [key: string]: any;
  };
}

export class AvalancheObservation extends Observation {
  declare properties: {
    stability: string;
    authorName: string;
    content: string;
    elevation: number;
    eventDate: string;
    latitude: number;
    locationName: string;
    longitude: number;
    region: string;
    regionLabel: string;
    reportDate: string;
    [key: string]: any;
  };
}

export class SizedAvalancheObservation extends AvalancheObservation {
  declare public properties: AvalancheObservation["properties"] & {
    avalancheSize: number | null;
  };

  static fromObservation(observation: AvalancheObservation): SizedAvalancheObservation {
    return SizedAvalancheObservations.normalizeObservation(observation);
  }
}

export class TriggeredAvalancheObservation extends AvalancheObservation {
  declare public properties: AvalancheObservation["properties"] & {
    avalancheType: string | null;
    triggerType: string | null;
  };

  static fromObservation(observation: AvalancheObservation): TriggeredAvalancheObservation {
    return TriggeredAvalancheObservations.normalizeObservation(observation);
  }
}

/**
 * Blog Data Models
 */

export interface BlogData {
  regionCode: string;
  lang: string;
  blogItems: BlogItem[];
}

export interface BlogItem {
  id: number;
  title: string;
  published: string;
  categories: string[];
}
