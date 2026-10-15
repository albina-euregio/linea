import * as v from "valibot";
import type { Unit } from "./units";
import { alignTimestampsWasm } from "./smet-wasm";

/**
 * Parameter type following the [SMET specification](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf)
 */
export const ParameterTypeSchema = v.picklist([
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
  "SurfaceHoar",
  /**
   * DrySnowfallLevel Dry snowfall level (DSL), in m: the elevation above which
   * 100% of the precipitation falls as dry snow, i.e. the elevation above which
   * there is no relevant moisture entry into the snowpack and hence no
   * melt-freeze crusts will develop from this specific precipitation event.
   *
   * @see Hofmann, Lehnert, Mitterer (2024): Automated dry-snowfall level
   * calculation for improved assessment of melt-freeze crusts and associated
   * faceted weak layers. Proceedings ISSW 2024, Tromsø.
   * https://arc.lib.montana.edu/snow-science/objects/ISSW2024_P1.7.pdf
   */
  "DrySnowfallLevel",
]);
export type ParameterType = v.InferOutput<typeof ParameterTypeSchema>;

export type Units = Partial<Record<ParameterType, Unit>>;

/**
 * One value per timestamp, `NaN` where no value exists (missing measurement or timestamp).
 */
export type Series = Float64Array;

export type Values = Partial<Record<ParameterType, Series>>;

/**
 * Creates a series of `length` values computed by `value` (a plain loop is considerably
 * faster than `Float64Array.from` with a mapping function).
 */
export function seriesOf(length: number, value: (i: number) => number): Series {
  const series = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    series[i] = value(i);
  }
  return series;
}

/**
 * Converts the values to a {@link Series}, `null` and `undefined` become `NaN`.
 */
export function toSeries(values: ArrayLike<number | null | undefined>): Series {
  return values instanceof Float64Array ? values : seriesOf(values.length, (i) => values[i] ?? NaN);
}

/** values as plain arrays (e.g. from providers or JSON), `null` marks missing values */
export type ValuesInput = Partial<Record<ParameterType, ArrayLike<number | null | undefined>>>;

/**
 * Converts all values to {@link Series}, see {@link toSeries}.
 */
export function toValues(values: ValuesInput): Values {
  const converted: Values = {};
  let key: ParameterType;
  for (key in values) {
    if (values[key]) converted[key] = toSeries(values[key]);
  }
  return converted;
}

export type ForecastValues = {
  timestamps: number[];
  values: Values;
};

export class StationData {
  values: Values;
  forecast?: ForecastValues;

  constructor(
    public station: string,
    public altitude: number,
    public timestamps: number[],
    public units: Units,
    values: ValuesInput,
    forecast?: { timestamps: number[]; values: ValuesInput },
  ) {
    this.values = toValues(values);
    this.forecast = forecast && {
      timestamps: forecast.timestamps,
      values: toValues(forecast.values),
    };
  }

  /**
   * Serializes the series as plain arrays, `NaN` becomes `null`.
   */
  toJSON() {
    const { station, altitude, timestamps, units, values, forecast } = this;
    const toArrays = (values: Values) =>
      Object.fromEntries(Object.entries(values).map(([key, series]) => [key, Array.from(series)]));
    return {
      station,
      altitude,
      timestamps,
      units,
      values: toArrays(values),
      forecast: forecast && { timestamps: forecast.timestamps, values: toArrays(forecast.values) },
    };
  }

  /**
   * Filters the Results for each LineaChart for the given timespan.
   * Passes the filtered data to the LineaCharts
   * @param startDate from where the data shall be shown
   * @param endDate to when the data shall be shown
   */
  filter(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;

    /** slices timestamps and values to the timespan, timestamps are sorted ascending */
    const slice = (timestamps: number[], values: Values) => {
      const from = partitionPoint(timestamps, (t) => t < startTimestamp);
      const to = partitionPoint(timestamps, (t) => t <= endTimestamp);
      const sliced: Values = {};
      let key: ParameterType;
      for (key in values) {
        if (values[key]) sliced[key] = values[key].slice(from, to);
      }
      return { timestamps: timestamps.slice(from, to), values: sliced };
    };

    const { timestamps: filteredTimestamps, values: filteredValues } = slice(
      this.timestamps,
      this.values,
    );
    const filteredForecast = this.forecast && slice(this.forecast.timestamps, this.forecast.values);

    return new StationData(
      this.station,
      this.altitude,
      filteredTimestamps,
      this.units,
      filteredValues,
      filteredForecast,
    );
  }

  /**
   * Calculates the surface hoar series data from this station's dew point and
   * snow surface temperature series. Filters for surface hoar potential which is
   * longer than 1 hour.
   *
   * @returns The surface hoar data for the charts data
   */
  generateSurfaceHoarData(TD: Series = this.values.TD ?? new Float64Array()): Series {
    if (this.values.SurfaceHoar) {
      return this.values.SurfaceHoar;
    }
    this.values.SurfaceHoar = new Float64Array(TD.length);

    const timestamps = this.timestamps;
    const TSS = this.values.TSS ?? new Float64Array(TD.length).fill(NaN);

    let i = 0;
    while (i < TD.length) {
      if (TD[i] < 0 && TSS[i] < TD[i]) {
        const startIdx = i;
        let endIdx = i;

        while (endIdx + 1 < TD.length && TD[endIdx + 1] < 0 && TSS[endIdx + 1] < TD[endIdx + 1]) {
          endIdx++;
        }

        const duration = timestamps[endIdx] - timestamps[startIdx];
        const mark = duration >= 3600_000 ? 1000 : -100;

        for (let j = startIdx; j <= endIdx; j++) {
          this.values.SurfaceHoar[j] = mark;
        }

        i = endIdx + 1;
      } else {
        this.values.SurfaceHoar[i] = -100;
        i++;
      }
    }
    return this.values.SurfaceHoar;
  }

  /**
   * Calculates the dry snowfall level series for this station from its air
   * temperature and relative humidity series. For each timestamp the wet-bulb
   * temperature is derived from air temperature and relative humidity, and the
   * dry snowfall level (in m) is the altitude at which the wet-bulb temperature
   * crosses the rain/snow threshold, anchored at the station altitude.
   *
   * @param tpsyThreshold The wet-bulb temperature threshold (°C) separating
   * rain from snow (precipitation is assumed to be snow below it). Default: 0.3
   * @returns The dry snowfall level data for the charts data
   *
   * @see Hofmann, Lehnert, Mitterer (2024): Automated dry-snowfall level
   * calculation for improved assessment of melt-freeze crusts and associated
   * faceted weak layers. Proceedings ISSW 2024, Tromsø.
   * https://arc.lib.montana.edu/snow-science/objects/ISSW2024_P1.7.pdf
   * @see Threshold wet-bulb temperature ~0.3 °C for the rain/snow transition:
   * Nature Communications 9, 1148 (2018), https://doi.org/10.1038/s41467-018-03629-7
   */
  generateDrySnowfallLevelData(tpsyThreshold = 0.3): Series {
    if (this.values.DrySnowfallLevel) {
      return this.values.DrySnowfallLevel;
    }

    this.values.DrySnowfallLevel = seriesOf(this.timestamps.length, (i) => {
      const ta = this.values.TA?.[i];
      const rh = this.values.RH?.[i];
      if (ta == null || rh == null || !isFinite(ta) || !isFinite(rh)) {
        return NaN;
      }
      const tpsy = calculateWetBulb(ta, rh);
      return Math.round((tpsy - tpsyThreshold) / 0.006 + this.altitude);
    });

    /**
     * Calculates the wet-bulb temperature from air temperature and relative
     * humidity using an empirical second-order polynomial fit (RH in %).
     *
     * @param ta Air temperature in °C
     * @param rh Relative humidity in %
     * @returns Wet-bulb temperature in °C
     *
     * @see Hofmann, Lehnert, Mitterer (2024), Proceedings ISSW 2024, Tromsø.
     * https://arc.lib.montana.edu/snow-science/objects/ISSW2024_P1.7.pdf
     * Compare the arctan-based approximation in Stull (2011), J. Appl. Meteor.
     * Climatol. 50, https://doi.org/10.1175/JAMC-D-11-0143.1
     */
    function calculateWetBulb(ta: number, rh: number): number {
      return (
        -5.806 +
        0.672 * ta -
        0.006 * ta ** 2 +
        (0.061 + 0.004 * ta + 0.000099 * ta ** 2) * rh +
        (-0.000033 - 0.000005 * ta - 0.0000001 * ta ** 2) * rh ** 2
      );
    }
    return this.values.DrySnowfallLevel;
  }
}

export class StationDataArray extends Array<StationData> {
  static from(
    data: {
      station: string;
      altitude: number;
      timestamps: number[];
      units: Units;
      values: ValuesInput;
    }[],
  ) {
    return new StationDataArray(
      ...data.map((d) => new StationData(d.station, d.altitude, d.timestamps, d.units, d.values)),
    );
  }

  /**
   * Merges the results from the new fetch with the existing results in the view
   * and generalizes them, see {@link generalize}.
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
      newResults = new StationDataArray();
    }
    const { timestamps: allTimestamps, indices } = alignTimestamps([
      ...this.map((res) => res.timestamps),
      ...this.map((_, i) => newResults[i]?.timestamps ?? []),
    ]);

    for (let i = 0; i < this.length; i++) {
      const oldResult = this[i];
      const newResult = newResults[i];
      const oldIndices = indices[i];
      const newIndices = indices[this.length + i];

      let key: ParameterType;
      for (key in oldResult.values) {
        const oldSeries = oldResult.values[key];
        const newSeries = newResult?.values[key];
        oldResult.values[key] = seriesOf(allTimestamps.length, (t) => {
          const oldValue = oldIndices[t] < 0 ? NaN : oldSeries[oldIndices[t]];
          const newValue = newIndices[t] < 0 || !newSeries ? NaN : newSeries[newIndices[t]];
          // existing values take precedence over newly loaded ones
          return Number.isNaN(oldValue) ? newValue : oldValue;
        });
      }
      // set the common timeline to all results
      oldResult.timestamps = allTimestamps.slice();
    }
  }

  /**
   * Generalizes the data stored in the results list:
   * ensures that all Results objects have the same timestamps and fill up missing data.
   * if the first chart has data from e.g. 03:00 to 05:00 and the second from 04:00 to 06:00 after this function
   * both will have data from 03:00 to 06:00 with NaN values in 03:00 to 04:00 for the second and from 05:00 to 06:00 for the first
   * so we can show all available data
   */
  generalize(): void {
    if (this.length === 0) {
      console.log(this);
      console.warn("No results to generalize");
      return;
    }
    this.mergeWith(new StationDataArray());
  }

  get minMaxTime(): [number, number] {
    return [
      Math.min(...this.map((v) => v.timestamps.at(0))),
      Math.max(...this.map((v) => v.timestamps.at(-1))),
    ];
  }
}

/**
 * Returns the sorted, de-duplicated union of the given timestamp arrays, and for each input
 * the index of each union timestamp in that input (or -1 if absent).
 * Computed once per station so that each parameter series is aligned by a plain array lookup.
 */
function alignTimestamps(inputs: number[][]): { timestamps: number[]; indices: Int32Array[] } {
  const wasm = alignTimestampsWasm(inputs);
  if (wasm) return wasm;
  const timestamps = [...new Set(inputs.flat())].sort((a, b) => a - b);
  const indices = inputs.map((source) => {
    const indexByTimestamp = new Map(source.map((t, i) => [t, i]));
    return Int32Array.from(timestamps, (t) => indexByTimestamp.get(t) ?? -1);
  });
  return { timestamps, indices };
}

/**
 * Returns the index of the first element of the partitioned `array` not satisfying `predicate`,
 * i.e. all elements before satisfy it and all from there on do not. Uses binary search.
 */
function partitionPoint<T>(array: T[], predicate: (value: T) => boolean): number {
  let lo = 0;
  let hi = array.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (predicate(array[mid])) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
