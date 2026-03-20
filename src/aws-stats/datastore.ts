import { parseBulletinCollection, type Bulletin, type BulletinCollection } from "./bulletin-schema";

export class Observations {
  public observations: Observation[];

  constructor(observations: Observation[] = []) {
    this.observations = observations;
  }

  async loadObservations(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load observations: ${response.statusText}`);
      }
      const observations = await response.json();

      this.observations = observations.features.map((feature: any) => {
        return {
          id: feature.id,
          source: feature.source,
          type: feature.type,
          geometry: {
            type: feature.geometry.type,
            coordinates: feature.geometry.coordinates,
          },
          properties: feature.properties,
        };
      });
    } catch (error) {
      console.error(error);
    }
  }

  get countperday(): { timestamps: number[]; countPerDay: number[] } {
    const countMap: { [date: string]: number } = {};
    this.observations.forEach((obs) => {
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
    return new Observations(
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

export class Observation {
  public id: string;
  public source: string;
  public type: string;

  public geometry: {
    type: string;
    coordinates: number[];
  };

  public properties: {
    [key: string]: any;
  };
}

export class AvalancheObservation extends Observation {
  public properties: {
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

  async loadBulletins(
    regionID: string,
    startDate: string,
    endDate: string,
  ): Promise<BulletinCollection> {
    const urls: string[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const url = `https://static.avalanche.report/bulletins/${dateStr}/${dateStr}_EUREGIO_{i18n.lang}_CAAMLv6.json`;
      urls.push(url);
    }

    const allBulletins: Bulletin[] = [];
    for (const u of urls) {
      try {
        const response = await fetch(u);
        if (!response.ok) {
          console.error(`Failed to load bulletin from ${u}: ${response.statusText}`);
          continue;
        }
        const payload: unknown = await response.json();
        const parsed = parseBulletinCollection(payload);
        allBulletins.push(...parsed.bulletins);
      } catch (error) {
        console.error(`Error loading bulletin from ${u}:`, error);
      }
    }
    this.bulletins = allBulletins;
    return { bulletins: allBulletins };
  }

  async loadBulletinsSingleSource(url: string): Promise<BulletinCollection> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load bulletins: ${response.statusText}`);
    }
    const payload: unknown = await response.json();
    const parsed = parseBulletinCollection(payload);
    this.bulletins = parsed.bulletins;
    return parsed;
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
      if (bulletin.dangerRatings) {
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
