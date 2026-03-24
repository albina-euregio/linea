/**
 * Parameter type following the [SMET specification](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf)
 */
export enum ParameterType {
  /** P Air pressure, in Pa */
  "P" = "P",
  /** TA Temperature Air, in Kelvin */
  "TA" = "TA",
  /** TD Temperature Dew Point, in Kelvin */
  "TD" = "TD",
  /** TSS Temperature Snow Surface, in Kelvin */
  "TSS" = "TSS",
  /** TSG Temperature Surface Ground, in Kelvin */
  // "TSG" = "TSG",
  /** RH Relative Humidity, between 0 and 1 */
  "RH" = "RH",
  /** VW_MAX Maximum wind velocity, in m/s */
  "VW_MAX" = "VW_MAX",
  /** VW Velocity Wind, in m/s */
  "VW" = "VW",
  /** DW Direction Wind, in degrees, clockwise and north being zero degrees */
  "DW" = "DW",
  /** ISWR Incoming Short Wave Radiation, in W/m2 */
  "ISWR" = "ISWR",
  /** RSWR Reflected Short Wave Radiation, in W/m2 (previously OSWR) */
  // "RSWR" = "RSWR",
  /** ILWR Incoming Long Wave Radiation, in W/m2 */
  // "ILWR" = "ILWR",
  /** OLWR Outgoing Long Wave Radiation, in W/m2 */
  // "OLWR" = "OLWR",
  /** PINT Precipitation Intensity, in mm/h, as an average over the timestep */
  // "PINT" = "PINT",
  /** PSUM Precipitation accumulation, in mm, summed over the last timestep */
  "PSUM" = "PSUM",
  /** HS Height Snow, in m */
  "HS" = "HS",
  "NS" = "NS",
}

export type Units = Partial<Record<ParameterType, string>>;

export type Values = Partial<Record<ParameterType, (number | null)[]>>;

export class StationData {
  constructor(
    public station: string,
    public altitude: number,
    public timestamps: number[],
    public units: Units,
    public values: Values,
  ) {}

  /**
   * Merges the results from the new fetch with the existing results in the view.
   * Mainly implemented to integrate the lazy source data into the existing one.
   * The first loaded data decides about the keys to show.
   * @param existing The existing results
   * @param newResults The results to integrate into the existing.
   * It is assumed that the order of the results in the newResults array corresponds to the order of the results in the existing array.
   *
   * The merged data is stored in the existing object.
   * @return StationData[] - The merged results
   */
  static merge(existing: StationData[], newResults: StationData[]): StationData[] {
    if (existing.length === 0) {
      return newResults;
    }

    const results: StationData[] = [];
    for (let i = 0; i < existing.length; i++) {
      const oldResult = existing[i];
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

      results.push(
        new StationData(
          oldResult.station,
          oldResult.altitude,
          mergedTimestamps,
          oldResult.units,
          mergedValues,
        ),
      );
    }
    return results;
  }
}
