import { z } from "zod";
import type { Unit } from "./units";

/**
 * Parameter type following the [SMET specification](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf)
 */
export const ParameterTypeSchema = z.enum([
  /** P Air pressure, in Pa */
  "P",
  /** TA Temperature Air, in Kelvin */
  "TA",
  /** TD Temperature Dew Point, in Kelvin */
  "TD",
  /** TSS Temperature Snow Surface, in Kelvin */
  "TSS",
  /** TSG Temperature Surface Ground, in Kelvin */
  "TSG",
  /** RH Relative Humidity, between 0 and 1 */
  "RH",
  /** VW_MAX Maximum wind velocity, in m/s */
  "VW_MAX",
  /** VW Velocity Wind, in m/s */
  "VW",
  /** DW Direction Wind, in degrees, clockwise and north being zero degrees */
  "DW",
  /** ISWR Incoming Short Wave Radiation, in W/m2 */
  "ISWR",
  /** RSWR Reflected Short Wave Radiation, in W/m2 (previously OSWR) */
  "RSWR",
  /** ILWR Incoming Long Wave Radiation, in W/m2 */
  "ILWR",
  /** OLWR Outgoing Long Wave Radiation, in W/m2 */
  "OLWR",
  /** PINT Precipitation Intensity, in mm/h, as an average over the timestep */
  "PINT",
  /** PSUM Precipitation accumulation, in mm, summed over the last timestep */
  "PSUM",
  /** HS Height Snow, in m */
  "HS",
  "NS",
]);
export type ParameterType = z.infer<typeof ParameterTypeSchema>;

export type Units = Partial<Record<ParameterType, Unit>>;

export type Values = Partial<Record<ParameterType, (number | null)[]>>;

export type ForecastValues = {
  timestamps: number[];
  values: Values;
};

export class StationData {
  constructor(
    public station: string,
    public altitude: number,
    public timestamps: number[],
    public units: Units,
    public values: Values,
    public forecast?: ForecastValues,
  ) {}

  /**
   * Filters the Results for each LineaChart for the given timespan.
   * Passes the filtered data to the LineaCharts
   * @param startDate from where the data shall be shown
   * @param endDate to when the data shall be shown
   */
  filter(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;

    let filteredValues: Values = {};

    let key: ParameterType;
    for (key in this.values) {
      const series = this.values[key];
      if (!series) {
        continue;
      }
      filteredValues[key] = series.filter(
        (_, j) => this.timestamps[j] >= startTimestamp && this.timestamps[j] <= endTimestamp,
      );
    }
    const filteredTimestamps = this.timestamps.filter(
      (t) => t >= startTimestamp && t <= endTimestamp,
    );

    let filteredForecast: ForecastValues | undefined = undefined;
    if (this.forecast) {
      const forecastTimestamps = this.forecast.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      const forecastValues: Values = {};
      let forecastKey: ParameterType;
      for (forecastKey in this.forecast.values) {
        const series = this.forecast.values[forecastKey];
        if (!series) {
          continue;
        }
        forecastValues[forecastKey] = series.filter(
          (_, j) =>
            this.forecast &&
            this.forecast.timestamps[j] >= startTimestamp &&
            this.forecast.timestamps[j] <= endTimestamp,
        );
      }
      filteredForecast = {
        timestamps: forecastTimestamps,
        values: forecastValues,
      };
    }

    return new StationData(
      this.station,
      this.altitude,
      filteredTimestamps,
      this.units,
      filteredValues,
      filteredForecast,
    );
  }
}

export class StationDataArray extends Array<StationData> {
  static from(
    data: {
      station: string;
      altitude: number;
      timestamps: number[];
      units: Units;
      values: Values;
    }[],
  ) {
    return new StationDataArray(
      ...data.map((d) => new StationData(d.station, d.altitude, d.timestamps, d.units, d.values)),
    );
  }

  /**
   * Merges the results from the new fetch with the existing results in the view.
   * Mainly implemented to integrate the lazy source data into the existing one.
   * The first loaded data decides about the keys to show.
   * @param newResults The results to integrate into the existing.
   * It is assumed that the order of the results in the newResults array corresponds to the order of the results in the existing array.
   *
   * The merged data is stored in the existing object.
   */
  mergeWith(newResults: StationDataArray): void {
    if (this.length === 0) {
      this.push(...newResults);
      return;
    }

    for (let i = 0; i < this.length; i++) {
      const oldResult = this[i];
      const newResult = newResults[i];
      if (oldResult === undefined || newResult === undefined) {
        continue;
      }
      const oldTimestamps = oldResult.timestamps;
      const newTimestamps = newResult.timestamps;
      const mergedTimestamps = [...new Set([...oldTimestamps, ...newTimestamps])].sort(
        (a, b) => a - b,
      );

      const oldIndexMap = new Map<number, number>();
      for (let j = 0; j < oldTimestamps.length; j++) {
        oldIndexMap.set(oldTimestamps[j], j);
      }
      const newIndexMap = new Map<number, number>();
      for (let j = 0; j < newTimestamps.length; j++) {
        newIndexMap.set(newTimestamps[j], j);
      }

      const mergedValues: Values = {};

      let key: ParameterType;
      for (key in oldResult.values) {
        mergedValues[key] = Array.from({ length: mergedTimestamps.length });
      }

      for (let t = 0; t < mergedTimestamps.length; t++) {
        const timestamp = mergedTimestamps[t];
        const oldIndex = oldIndexMap.get(timestamp);
        const newIndex = newIndexMap.get(timestamp);

        for (key in oldResult.values) {
          if (oldIndex !== undefined) {
            mergedValues[key][t] = oldResult.values[key][oldIndex];
          } else if (newIndex !== undefined) {
            mergedValues[key][t] = newResult.values[key][newIndex];
          } else {
            mergedValues[key][t] = null;
          }
        }
      }

      oldResult.timestamps = mergedTimestamps;
      oldResult.values = mergedValues;
    }
  }

  /**
   * Generalizes the data stored in the results list:
   * ensures that all Results objects have the same timestamps and fill up missing data.
   * if the first chart has data from e.g. 03:00 to 05:00 and the second from 04:00 to 06:00 after this function
   * both will have data from 03:00 to 06:00 with null values in 03:00 to 04:00 for the second and from 05:00 to 06:00 for the first
   * so we can show all available data
   */
  generalize(): void {
    if (this.length === 0) {
      console.log(this);
      console.warn("No results to generalize");
      return;
    }
    const tsSet = new Set<number>();
    for (const res of this) {
      for (const t of res.timestamps) {
        tsSet.add(t);
      }
    }
    const allTimestamps = Array.from(tsSet).sort((a, b) => a - b);

    for (const res of this) {
      let key: ParameterType;
      for (key in res.values) {
        const map = new Map<number, number>();
        for (let i = 0; i < res.timestamps.length; i++) {
          map.set(res.timestamps[i], res.values[key][i]);
        }
        res.values[key] = allTimestamps.map((t) => (map.has(t) ? (map.get(t) ?? null) : NaN));
      }
      // set the common timeline to all results
      res.timestamps = allTimestamps.slice();
    }
  }

  get minMaxTime(): [number, number] {
    return [
      Math.min(...this.map((v) => v.timestamps.at(0))),
      Math.max(...this.map((v) => v.timestamps.at(-1))),
    ];
  }
}
