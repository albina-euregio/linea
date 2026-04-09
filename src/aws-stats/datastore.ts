import {
  AvalancheObservation,
  Observation,
  SizedAvalancheObservation,
  TriggeredAvalancheObservation,
  type BlogData,
} from "./datatypes";
import type {
  DangerRatingModificator,
  DangerSourceVariant,
  EAWSMatrixInformation,
} from "../schema/danger-source-data";
import { type AvalancheProblemType, type Bulletin } from "../schema/caaml";
import type { StressData } from "../schema/stress";

export class Observations {
  public observations: Observation[];

  constructor(observations: Observation[] = []) {
    this.observations = observations;
  }

  async loadObservations(url: string, filterMicroRegions: string[]) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load observations: ${response.statusText}`);
      }
      const observations = await response.json();

      this.observations = observations.features
        .filter((feature: any) => {
          if (filterMicroRegions.length === 0) {
            return true;
          }
          return (
            feature.properties.region &&
            filterMicroRegions.some((region) => feature.properties.region.startsWith(region))
          );
        })
        .map((feature: any) => {
          return {
            id: feature.id,
            source: feature.source,
            type: feature.type,
            geometry: {
              type: feature.geometry.type,
              coordinates: feature.geometry.coordinates,
            },
            properties: feature.properties,
            region: feature.region ?? undefined,
          };
        });
    } catch (error) {
      console.error(error);
    }
  }

  get countperday(): { timestamps: number[]; countPerDay: number[] } {
    return this.countPerDay(this.observations);
  }

  countPerDay(observations: Observation[]): { timestamps: number[]; countPerDay: number[] } {
    const countMap: { [date: string]: number } = {};
    observations.forEach((obs) => {
      const date = obs.properties.eventDate.split("T")[0];
      countMap[date] = (countMap[date] || 0) + 1;
    });
    const sorted = Object.entries(countMap)
      .map(([date, count]) => ({ timestamp: new Date(date).getTime(), count }))
      .sort((a, b) => a.timestamp - b.timestamp);
    return {
      timestamps: sorted.map((e) => e.timestamp),
      countPerDay: sorted.map((e) => e.count),
    };
  }

  get timestamps() {
    return this.observations.map((obs) => new Date(obs.properties.eventDate).getTime());
  }

  get avalanches() {
    return new AvalancheObservations(
      this.observations.filter(
        (obs) => obs.properties.$type === "Avalanche",
      ) as AvalancheObservation[],
    );
  }

  get sizedAvalanches() {
    return new SizedAvalancheObservations(
      this.observations.filter(
        (obs) => obs.properties.$type === "Avalanche",
      ) as AvalancheObservation[],
    );
  }

  get triggeredAvalanches() {
    return new TriggeredAvalancheObservations(
      this.observations.filter(
        (obs) => obs.properties.$type === "Avalanche",
      ) as AvalancheObservation[],
    );
  }

  get length() {
    return this.observations.length;
  }

  static mergeAndFillData(dataPairs: { timestamps: number[]; data: number[] }[]): {
    timestamps: number[];
    seriesData: (number | null)[][];
  } {
    if (dataPairs.length === 0) {
      return { timestamps: [], seriesData: [] };
    }
    const allTimestamps = new Set<number>();
    dataPairs.forEach((pair) => {
      pair.timestamps.forEach((ts) => allTimestamps.add(ts));
    });
    const mergedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    const indexMaps = dataPairs.map((pair) => {
      const map = new Map<number, number>();
      for (let j = 0; j < pair.timestamps.length; j++) {
        map.set(pair.timestamps[j], j);
      }
      return map;
    });

    const seriesData: (number | null)[][] = dataPairs.map((pair, pairIdx) => {
      return mergedTimestamps.map((timestamp) => {
        const dataIndex = indexMaps[pairIdx].get(timestamp);
        return dataIndex !== undefined ? pair.data[dataIndex] : null;
      });
    });

    return { timestamps: mergedTimestamps, seriesData };
  }
}

export class AvalancheObservations extends Observations {
  constructor(observations: AvalancheObservation[] = []) {
    super(observations);
  }

  get items(): AvalancheObservation[] {
    return this.observations as AvalancheObservation[];
  }
}

export class SizedAvalancheObservations extends AvalancheObservations {
  constructor(observations: AvalancheObservation[] = []) {
    super(SizedAvalancheObservations.normalizeAll(observations));
  }

  static normalizeAll(observations: AvalancheObservation[]): SizedAvalancheObservation[] {
    return observations
      .map((obs) => SizedAvalancheObservations.normalizeObservation(obs))
      .filter((v) => !!v.properties.avalancheSize);
  }

  static normalizeObservation(observation: AvalancheObservation): SizedAvalancheObservation {
    const props = (observation.properties ?? {}) as Record<string, any>;
    const aspect = props.aspect ?? (Array.isArray(props.aspects) ? props.aspects[0] : undefined);
    const avalancheSize = extractAvalancheSize(props);

    const normalizedProperties: {} = {
      ...props,
      aspect: aspect ?? "",
      avalancheSize,
    };

    return {
      ...observation,
      properties: normalizedProperties,
    } as SizedAvalancheObservation;
  }

  get items(): SizedAvalancheObservation[] {
    return this.observations as SizedAvalancheObservation[];
  }

  get avalanchesPerDay(): { timestamps: number[]; avalanches: SizedAvalancheObservation[][] } {
    const countMap: Record<number, SizedAvalancheObservation[]> = {};

    this.items.forEach((obs) => {
      const eventDate = new Date(obs.properties?.eventDate);
      if (Number.isNaN(eventDate.getTime())) {
        return;
      }
      const day = new Date(eventDate.toISOString().split("T")[0]).getTime();
      countMap[day] = [...(countMap[day] ?? []), obs];
    });

    const sorted = Object.entries(countMap)
      .map(([date, avalanches]) => ({ timestamp: parseInt(date), avalanches: avalanches }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      timestamps: sorted.map((entry) => entry.timestamp),
      avalanches: sorted.map((entry) => entry.avalanches),
    };
  }

  calculateAvalancheIndexPerDay(
    timestamps: number[],
    avalanches: SizedAvalancheObservation[][],
  ): { timestamps: number[]; avalancheIndices: number[] } {
    const avalancheIndices: number[] = [];

    const converter: Record<number, number> = {
      1: 0.01,
      2: 0.1,
      3: 1,
      4: 10,
      5: 100,
    };

    for (let i = 0; i < timestamps.length; i++) {
      const dayAvalanches = avalanches[i] ?? [];

      const aai = dayAvalanches
        .map((v) => {
          return converter[v.properties.avalancheSize!];
        })
        .reduce((acc, val) => (acc ?? 0) + (val ?? 0), 0);
      avalancheIndices.push(aai!);
    }

    return {
      timestamps,
      avalancheIndices,
    };
  }
}

export class TriggeredAvalancheObservations extends AvalancheObservations {
  constructor(observations: AvalancheObservation[] = []) {
    super(TriggeredAvalancheObservations.normalizeAll(observations));
  }

  static normalizeAll(observations: AvalancheObservation[]): TriggeredAvalancheObservation[] {
    return observations.map((obs) => TriggeredAvalancheObservations.normalizeObservation(obs));
  }

  static normalizeObservation(observation: AvalancheObservation): TriggeredAvalancheObservation {
    const props = (observation.properties ?? {}) as Record<string, any>;
    const avalancheType = extractAvalancheType(props);
    const triggerType = extractTriggerType(props);

    const normalizedProperties: {} = {
      ...props,
      avalancheType,
      triggerType,
    };

    return {
      ...observation,
      properties: normalizedProperties,
    } as TriggeredAvalancheObservation;
  }

  get items(): TriggeredAvalancheObservation[] {
    return this.observations as TriggeredAvalancheObservation[];
  }

  get spontanousCount(): { timestamps: number[]; countPerDay: number[] } {
    return this.countPerDay(
      this.items.filter((obs) => obs.properties.triggerType === "spontaneous"),
    );
  }

  get triggeredCount(): { timestamps: number[]; countPerDay: number[] } {
    return this.countPerDay(
      this.items.filter(
        (obs) =>
          obs.properties.triggerType === "triggered" || obs.properties.triggerType === "artificial",
      ),
    );
  }

  get unknownCount(): { timestamps: number[]; countPerDay: number[] } {
    return this.countPerDay(this.items.filter((obs) => obs.properties.triggerType === "unknown"));
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function extractAvalancheSize(properties: Record<string, any>): number | null {
  const byNested = toNumber(properties.avalanche?.size?.id);
  if (byNested !== undefined) {
    return byNested;
  }

  const byExtraRows = Array.isArray(properties.$extraDialogRows)
    ? properties.$extraDialogRows.find((row: any) => row?.label === "observations.avalancheSize")
    : undefined;
  const byExtraValue = toNumber(byExtraRows?.value);
  if (byExtraValue !== undefined) {
    return byExtraValue;
  }

  const byLawisField = toNumber(properties.avalancheSize);
  if (byLawisField !== undefined) {
    return byLawisField;
  }

  const sizeText = String(
    properties.avalancheSize ?? properties.LAWINENGROESSE ?? "",
  ).toLowerCase();
  if (sizeText.includes("small") || sizeText.includes("klein")) {
    return 1;
  }
  if (sizeText.includes("medium") || sizeText.includes("mittel")) {
    return 2;
  }
  if (sizeText.includes("very") || sizeText.includes("sehr")) {
    return 4;
  }
  if (sizeText.includes("large") || sizeText == "gross") {
    return 3;
  }
  return null;
}

function extractAvalancheType(properties: Record<string, any>): string | null {
  // Try nested avalanche.type (Lawis)
  const byNested = properties.avalanche?.type?.text ?? properties.avalanche?.type?.id;
  if (byNested) {
    return String(byNested);
  }

  // Try direct field (LoLaKronos, Snobs)
  const byDirect = properties.avalancheType;
  if (byDirect) {
    return String(byDirect);
  }

  // Try German field (LwdKip)
  const byGerman = properties.LAWINENART;
  if (byGerman) {
    return String(byGerman);
  }

  // Try extraDialogRows
  const byExtra = Array.isArray(properties.$extraDialogRows)
    ? properties.$extraDialogRows.find(
        (row: any) => row?.label?.includes("avalancheType") || row?.label?.includes("Lawinenart"),
      )
    : undefined;
  if (byExtra?.value) {
    return String(byExtra.value);
  }

  return null;
}

function convertTriggerType(text: string): "artificial" | "spontaneous" | "unknown" {
  switch (text.toLowerCase()) {
    case "artificial":
    case "remote":
    case "lowAdditionalLoad":
    case "highAdditionalLoad":
    case "blast":
      return "artificial";
    case "spontaneous":
      return "spontaneous";
    default:
      return "unknown";
  }
}

function extractTriggerType(
  properties: Record<string, any>,
): "artificial" | "spontaneous" | "unknown" {
  // Try nested avalanche.release (Lawis)
  const byNested = properties.avalanche?.release?.text as "artificial" | "spontaneous" | "unknown";
  if (byNested) {
    return convertTriggerType(byNested);
  }

  // Try direct field (LoLaKronos, Snobs)
  const byDirect = properties.avalancheRelease;
  if (byDirect) {
    return convertTriggerType(byDirect);
  }

  // Try German explosion field (LwdKip) - SPRENGUNG: 0 = spontaneous, 1 = explosive/artificial
  const byGerman = properties.SPRENGUNG;
  if (byGerman !== undefined) {
    return byGerman ? "artificial" : "spontaneous";
  }

  // Try extraDialogRows
  const byExtra = Array.isArray(properties.$extraDialogRows)
    ? properties.$extraDialogRows.find(
        (row: any) =>
          (row?.label?.includes("release") ||
            row?.label?.includes("Sprengung") ||
            row?.label?.includes("trigger")) &&
          (row?.value !== undefined || row?.boolean !== undefined),
      )
    : undefined;
  if (byExtra?.value !== undefined) {
    return convertTriggerType(String(byExtra.value));
  }
  if (byExtra?.boolean !== undefined) {
    return byExtra.boolean ? "artificial" : "spontaneous";
  }

  return "unknown";
}

export class WeatherStationData {
  public name: string;
  public altitude: number;
  public timestamps: number[];
  public values: Record<string, number[]>;

  constructor(jsonstring: string) {
    const data = JSON.parse(jsonstring);
    this.timestamps = data.timestamps;
    this.values = data.values;
    this.name = data.name;
    this.altitude = data.altitude;
  }

  public aggregateDailyPrecipitation(): { timestamps: number[]; values: number[] } {
    const timestamps = this.timestamps ?? [];
    const psum = (this.values?.PSUM as number[] | undefined) ?? [];
    const daily: Record<string, number> = {};

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const value = psum[i] ?? 0;
      const dateKey = new Date(ts).toISOString().split("T")[0];
      daily[dateKey] = (daily[dateKey] ?? 0) + value;
    }

    const sorted = Object.entries(daily)
      .map(([date, value]) => ({ timestamp: new Date(date).getTime(), value }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      timestamps: sorted.map((x) => x.timestamp),
      values: sorted.map((x) => x.value),
    };
  }
}

export class BulletinData {
  public bulletins: Bulletin[];

  constructor(bulletins: Bulletin[] = []) {
    this.bulletins = bulletins;
  }

  get length() {
    return this.bulletins.length;
  }

  get publicationTimestamps() {
    return this.bulletins
      .map((bulletin) => bulletin.publicationTime)
      .filter((value): value is string => typeof value === "string")
      .map((value) => Date.parse(value))
      .filter((value) => !Number.isNaN(value));
  }

  get bulletinsPerDay(): { timestamps: number[]; data: number[] } {
    const countMap: Record<number, Bulletin[]> = {};

    this.bulletins.forEach((bulletin) => {
      const day = BulletinData.dayTimestamp(
        bulletin.validTime?.endTime ?? bulletin.publicationTime,
      );
      if (day === null) {
        return;
      }
      countMap[day] = [...(countMap[day] ?? []), bulletin];
    });

    const sorted = Object.entries(countMap)
      .map(([date, bulletins]) => ({ timestamp: parseInt(date), bulletins }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      timestamps: sorted.map((entry) => entry.timestamp),
      data: sorted.map((entry) => entry.bulletins.length),
    };
  }

  filterRegionCode(regionCode: string): BulletinData {
    if (regionCode === "all") {
      return new BulletinData(this.bulletins);
    }
    return new BulletinData(
      this.bulletins.filter((bulletin) =>
        (bulletin.regions ?? []).some((region) =>
          region.regionID.toLowerCase().includes(regionCode.toLowerCase()),
        ),
      ),
    );
  }

  static dayTimestamp(value: string | undefined): number | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(date.toISOString().split("T")[0]).getTime();
  }

  private static conversion: Record<string, number> = {
    low: 1,
    moderate: 2,
    considerable: 3,
    high: 4,
    very_high: 5,
  };

  private static dangerRatingLevel(value: string | undefined): number {
    const normalized = value?.toLowerCase() ?? "";
    return BulletinData.conversion[normalized] ?? 0;
  }

  affectedMicroRegionsPerAvalancheProblemPerDay(regionCode: string = "all"): {
    timestamps: number[];
    ratings: Record<AvalancheProblemType, number[]>;
  } {
    const emptyProblemCounts = (): Record<AvalancheProblemType, number> => ({
      new_snow: 0,
      wind_slab: 0,
      persistent_weak_layers: 0,
      wet_snow: 0,
      gliding_snow: 0,
      cornices: 0,
      no_distinct_avalanche_problem: 0,
      favourable_situation: 0,
    });

    const perDay: Record<number, Record<AvalancheProblemType, number>> = {};

    this.bulletins.forEach((bulletin) => {
      const day = BulletinData.dayTimestamp(
        bulletin.validTime?.endTime ?? bulletin.publicationTime,
      );
      const matchedMicroRegionCount = (bulletin.regions ?? []).filter((region) =>
        regionCode === "all"
          ? true
          : region.regionID.toLowerCase().includes(regionCode.toLowerCase()),
      ).length;

      if (day === null || matchedMicroRegionCount === 0) {
        console.debug(`Skipping bulletin with no danger rating: ${bulletin.validTime?.endTime}`);
        return;
      }
      if (!bulletin.avalancheProblems) {
        console.debug("Missing avalanche Problems!");
        console.debug(bulletin);
        return;
      }

      const avalancheProblems = bulletin.avalancheProblems;
      if (!perDay[day]) {
        perDay[day] = emptyProblemCounts();
      }
      for (const avalancheProblem of avalancheProblems) {
        perDay[day][avalancheProblem.problemType] += matchedMicroRegionCount;
      }
    });

    const timestamps: number[] = Object.keys(perDay)
      .map((date) => Number(date))
      .sort((a, b) => a - b);
    const distribution: Record<AvalancheProblemType, number[]> = {
      new_snow: [],
      wind_slab: [],
      persistent_weak_layers: [],
      wet_snow: [],
      gliding_snow: [],
      cornices: [],
      no_distinct_avalanche_problem: [],
      favourable_situation: [],
    };

    for (let i = 0; i < timestamps.length; i++) {
      const ratings = perDay[timestamps[i]];
      const sum = Object.values(ratings).reduce((a, b) => a + b, 0);
      for (const problemType of Object.keys(ratings) as AvalancheProblemType[]) {
        distribution[problemType].push(sum > 0 ? (ratings[problemType] / sum) * 100 : 0);
      }
    }
    return { timestamps, ratings: distribution };
  }

  affectedMicroRegionsPerDangerPatternPerDay(regionCode: string = "all"): {
    timestamps: number[];
    ratings: {
      1: number[];
      2: number[];
      3: number[];
      4: number[];
      5: number[];
      6: number[];
      7: number[];
      8: number[];
      9: number[];
      10: number[];
    };
  } {
    const perDay: Record<
      number,
      {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
        6: number;
        7: number;
        8: number;
        9: number;
        10: number;
      }
    > = {};

    this.bulletins.forEach((bulletin) => {
      const day = BulletinData.dayTimestamp(
        bulletin.validTime?.endTime ?? bulletin.publicationTime,
      );
      const matchedMicroRegionCount = (bulletin.regions ?? []).filter((region) =>
        regionCode === "all"
          ? true
          : region.regionID.toLowerCase().includes(regionCode.toLowerCase()),
      ).length;

      if (day === null || matchedMicroRegionCount === 0) {
        console.debug(`Skipping bulletin with no danger rating: ${bulletin.validTime?.endTime}`);
        return;
      }
      if (
        !bulletin.customData ||
        !bulletin.customData["LWD_Tyrol"] ||
        !bulletin.customData["LWD_Tyrol"].dangerPatterns
      ) {
        return;
      }
      const dangerProblems = bulletin.customData["LWD_Tyrol"].dangerPatterns.map((dp: string) =>
        parseInt(dp.slice(2)),
      ) as (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)[];

      if (!perDay[day]) {
        perDay[day] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
      }
      for (const dangerProblem of dangerProblems) {
        perDay[day][dangerProblem] += matchedMicroRegionCount;
      }
    });

    const timestamps: number[] = Object.keys(perDay)
      .map((date) => Number(date))
      .sort((a, b) => a - b);
    const distribution: {
      1: number[];
      2: number[];
      3: number[];
      4: number[];
      5: number[];
      6: number[];
      7: number[];
      8: number[];
      9: number[];
      10: number[];
    } = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
    };

    for (let i = 0; i < timestamps.length; i++) {
      const ratings = perDay[timestamps[i]];
      const sum = Object.values(ratings).reduce((a, b) => a + b, 0);
      for (let rating = 1; rating <= 10; rating++) {
        const key = rating as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
        distribution[key].push(sum > 0 ? (ratings[key] / sum) * 100 : 0);
      }
    }
    return { timestamps, ratings: distribution };
  }

  affectedMicroRegionsPerDangerRatingPerDay(regionCode: string = "all"): {
    timestamps: number[];
    ratings: { 1: number[]; 2: number[]; 3: number[]; 4: number[]; 5: number[] };
  } {
    const perDay: Record<number, { 1: number; 2: number; 3: number; 4: number; 5: number }> = {};

    this.bulletins.forEach((bulletin) => {
      const day = BulletinData.dayTimestamp(
        bulletin.validTime?.endTime ?? bulletin.publicationTime,
      );
      const highestDangerRating = Math.max(
        ...(bulletin.dangerRatings?.map((r) => BulletinData.dangerRatingLevel(r.mainValue)) ?? [0]),
      );
      const matchedMicroRegionCount = (bulletin.regions ?? []).filter((region) =>
        regionCode === "all"
          ? true
          : region.regionID.toLowerCase().includes(regionCode.toLowerCase()),
      ).length;

      if (day === null || highestDangerRating === 0 || matchedMicroRegionCount === 0) {
        console.debug(`Skipping bulletin with no danger rating: ${bulletin.validTime?.endTime}`);
        return;
      }
      if (!perDay[day]) {
        perDay[day] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      }
      perDay[day][highestDangerRating as 1 | 2 | 3 | 4 | 5] += matchedMicroRegionCount;
    });

    const timestamps: number[] = Object.keys(perDay)
      .map((date) => Number(date))
      .sort((a, b) => a - b);
    const distribution: { 1: number[]; 2: number[]; 3: number[]; 4: number[]; 5: number[] } = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    for (let i = 0; i < timestamps.length; i++) {
      const ratings = perDay[timestamps[i]];
      const sum = Object.values(ratings).reduce((a, b) => a + b, 0);
      for (let rating = 1; rating <= 5; rating++) {
        const key = rating as 1 | 2 | 3 | 4 | 5;
        distribution[key].push(sum > 0 ? (ratings[key] / sum) * 100 : 0);
      }
    }
    return { timestamps, ratings: distribution };
  }

  filterForMicroRegions(microRegionCodes: string[]): BulletinData {
    return new BulletinData(
      this.bulletins.filter((bulletin) => {
        if (!bulletin.regions) {
          return false;
        }
        return bulletin.regions.some((region) => microRegionCodes.includes(region.regionID));
      }),
    );
  }

  regionIdToName(regionID: string): string {
    for (const bulletin of this.bulletins) {
      if (bulletin.regions) {
        const region = bulletin.regions.find((r) => r.regionID === regionID);
        if (region) {
          return region.name ?? "";
        }
      }
    }
    return "";
  }

  get dangerRatingDistribution(): { rating: number; count: number }[] {
    const conversion: Record<string, number> = {
      low: 1,
      moderate: 2,
      considerable: 3,
      high: 4,
      very_high: 5,
    };

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    this.bulletins.forEach((bulletin) => {
      if (bulletin.dangerRatings) {
        bulletin.dangerRatings.forEach((r) => {
          const ratingValue = conversion[r.mainValue?.toLowerCase() ?? ""] ?? 0;
          distribution[ratingValue] = (distribution[ratingValue] ?? 0) + 1;
        });
      }
    });
    return Object.entries(distribution).map(([rating, count]) => ({
      rating: Number(rating),
      count,
    }));
  }

  get highestDangerRatingPerDay(): { timestamps: number[]; rating: number[] } {
    const conversion: Record<string, number> = {
      low: 1,
      moderate: 2,
      considerable: 3,
      high: 4,
      very_high: 5,
    };

    const ratingMap: Record<string, number> = {};
    this.bulletins.forEach((bulletin) => {
      if (bulletin.dangerRatings && bulletin.validTime?.endTime) {
        const dateKey = new Date(bulletin.validTime.endTime).toISOString().split("T")[0];
        const maxRating = Math.max(
          ...bulletin.dangerRatings.map((r) => conversion[r.mainValue?.toLowerCase()] ?? null),
        );
        ratingMap[dateKey] = Math.max(ratingMap[dateKey] ?? 0, maxRating);
      }
    });
    return {
      timestamps: Object.keys(ratingMap).map((date) => new Date(date).getTime()),
      rating: Object.values(ratingMap),
    };
  }
}

export class BlogService {
  /**
   *
   * @param a BlogData object
   * @returns the blogs per day
   */
  static getBlogsPerDay(blogData: BlogData): { timestamps: number[]; data: number[] } {
    const map: Map<string, number> = new Map();

    for (const blogItem of blogData.blogItems) {
      const dateKey = new Date(blogItem.published).toISOString().split("T")[0];
      map.set(dateKey, (map.get(dateKey) ?? 0) + 1);
    }
    return {
      timestamps: Array.from(map.keys()).map((date) => new Date(date).getTime()),
      data: Array.from(map.values()),
    };
  }
}

export class DangerSourceVariantService {
  private dangerSourceVariants: DangerSourceVariant[] = [];

  constructor(dangerSourceVariants: DangerSourceVariant[]) {
    this.dangerSourceVariants = dangerSourceVariants;
  }

  get analysis(): DangerSourceVariantService {
    return new DangerSourceVariantService(
      this.dangerSourceVariants.filter((variant) => variant.dangerSourceVariantType === "analysis"),
    );
  }

  get active(): DangerSourceVariantService {
    return new DangerSourceVariantService(
      this.dangerSourceVariants.filter((variant) => variant.dangerSourceVariantStatus === "active"),
    );
  }

  get activeOrDormant(): DangerSourceVariantService {
    return new DangerSourceVariantService(
      this.dangerSourceVariants.filter(
        (variant) =>
          variant.dangerSourceVariantStatus === "active" ||
          variant.dangerSourceVariantStatus === "dormant",
      ),
    );
  }

  get inactive(): DangerSourceVariantService {
    return new DangerSourceVariantService(
      this.dangerSourceVariants.filter(
        (variant) => variant.dangerSourceVariantStatus === "inactive",
      ),
    );
  }

  getMatrixParamtersPerDangerSourceVariantPerDay(microRegion: string): {
    timestamps: number[];
    matrixParameters: Record<string, EAWSMatrixInformation[]>;
  } {
    const perDay: Record<number, Record<string, EAWSMatrixInformation>> = {};

    this.dangerSourceVariants
      .filter((variant) => variant.regions.includes(microRegion))
      .forEach((variant) => {
        const day = new Date(variant.validUntil.toISOString().split("T")[0]).getTime();
        if (day === null) {
          return;
        }
        if (!perDay[day]) {
          perDay[day] = {};
        }
        const key = variant.dangerSource.title ?? "unknown";
        if (variant.eawsMatrixInformation) {
          perDay[day][key] = variant.eawsMatrixInformation;
        }
      });

    const timestamps: number[] = Object.keys(perDay)
      .map((date) => Number(date))
      .sort((a, b) => a - b);

    const allKeys = new Set<string>();
    Object.values(perDay).forEach((dayData) => {
      Object.keys(dayData).forEach((key) => allKeys.add(key));
    });

    const sortedKeys = Array.from(allKeys).sort();

    const matrixParameters: Record<string, EAWSMatrixInformation[]> = {};
    sortedKeys.forEach((key) => {
      matrixParameters[key] = timestamps
        .map((ts) => perDay[ts]?.[key])
        .filter((v): v is EAWSMatrixInformation => !!v);
    });

    return { timestamps, matrixParameters };
  }

  getDangerRatingPerDangerSourceVariantPerDay(microRegion: string): {
    timestamps: number[];
    ratings: Record<string, number[]>;
  } {
    const perDay: Record<number, Record<string, number>> = {};
    this.dangerSourceVariants
      .filter((variant) => variant.regions.includes(microRegion))
      .forEach((variant) => {
        const day = new Date(variant.validUntil.toISOString().split("T")[0]).getTime();
        if (day === null) {
          return;
        }
        if (!perDay[day]) {
          perDay[day] = {};
        }
        const key = variant.dangerSource.title ?? "unknown";
        const rating =
          DangerSourceVariantService.convertStringDangerRatingToNumber(
            variant.eawsMatrixInformation?.dangerRating,
          ) ?? null;
        const subrating =
          DangerSourceVariantService.convertModificatorToNumber(
            variant.eawsMatrixInformation?.dangerRatingModificator,
          ) ?? 0;
        perDay[day][key] = rating ? rating + subrating : null;
      });

    const timestamps: number[] = Object.keys(perDay)
      .map((date) => Number(date))
      .sort((a, b) => a - b);
    const ratings = timestamps.map((ts) => perDay[ts]);
    const allKeys = new Set<string>();
    ratings.forEach((rating) => {
      Object.keys(rating).forEach((key) => allKeys.add(key));
    });
    const sortedKeys = Array.from(allKeys).sort();
    const filledRatings: Record<string, number[]> = {};
    sortedKeys.forEach((key) => {
      filledRatings[key] = ratings.map((rating) => rating[key]);
    });
    return { timestamps, ratings: filledRatings };
  }

  static convertStringDangerRatingToNumber(rating: string | undefined): number {
    const conversion: Record<string, number> = {
      low: 1,
      moderate: 2,
      considerable: 3,
      high: 4,
      very_high: 5,
    };
    return conversion[rating?.toLowerCase() ?? ""] ?? 0;
  }

  static convertModificatorToNumber(subRating: DangerRatingModificator | undefined): number {
    const conversion: Record<string, number> = {
      minus: -0.33,
      equal: 0,
      plus: +0.33,
    };
    return conversion[subRating ?? ""] ?? 0;
  }
}

export class StressService {
  static getStressPerPersonPerDay(stressData: StressData): {
    timestamps: number[];
    stressPerPerson: Record<string, number[]>;
  } {
    const stressMap: Record<string, Record<string, number>> = {};

    Object.keys(stressData).forEach((user) => {
      stressData[user].forEach((entry) => {
        const dateKey = entry.date;
        if (!stressMap[dateKey]) {
          stressMap[dateKey] = {};
        }
        stressMap[dateKey][user] = entry.stressLevel;
      });
    });

    const users = Object.keys(stressData);
    const sortedDateKeys = Object.keys(stressMap).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const stressPerPerson: Record<string, number[]> = {};
    users.forEach((user) => {
      stressPerPerson[user] = [];
    });

    sortedDateKeys.forEach((dateKey) => {
      const daily = stressMap[dateKey];
      users.forEach((user) => {
        stressPerPerson[user].push(daily[user] ?? 0);
      });
    });

    return {
      timestamps: sortedDateKeys.map((date) => new Date(date).getTime()),
      stressPerPerson,
    };
  }
}
