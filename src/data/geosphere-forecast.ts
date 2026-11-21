import * as v from "valibot";
import type { ParameterType, ValuesInput } from "./station-data";
import { createGeosphereForecastSchema } from "../schema/geosphere-forecast";

// GeoSphere Austria – C-LAEF ensemble forecast (median / 50th percentile, plus 10th and 90th percentiles)
// https://data.hub.geosphere.at/dataset/ensemble-v2-1h-1km
// Lizenz: CC BY 4.0 https://creativecommons.org/licenses/by/4.0/legalcode

const GEOSPHERE_FORECAST_BASE_URL =
  "https://dataset.api.hub.geosphere.at/v1/timeseries/forecast/ensemble-v2-1h-1km";

type Series = (number | null)[];

/** Assumed density of fresh snow [kg/m³] to convert snow water equivalent to snow height. */
const NEW_SNOW_DENSITY = 100;

/** Converts snow water equivalent [kg/m²] to snow height [cm]. */
function sweToSnowHeightCm(swe: number): number {
  return (swe / NEW_SNOW_DENSITY) * 100;
}

type Mapping = {
  smet?: ParameterType;
  convert?: (s: Series) => Series;
  /** whether the 10th and 90th percentiles are fetched as well */
  percentiles?: boolean;
};

/**
 * Direct mapping from GeoSphere forecast parameters (without percentile suffix) to SMET parameters.
 * Wind direction and speed are derived separately from the u/v components.
 */
const GEOSPHERE_FORECAST_MAPPING = {
  /** 2m temperature [°C] */
  "2t": { smet: "TA", percentiles: true },
  /** relative humidity 2m [%] */
  "2r": { smet: "RH", percentiles: true },
  /** 10m wind eastward [m/s] */
  "10u": { percentiles: true },
  /** 10m wind northward [m/s] */
  "10v": { percentiles: true },
  /** maximum 10m wind gust in the last interval [m/s] → km/h */
  "10fg": {
    smet: "VW_MAX",
    convert: (s) => s.map((x) => (x === null ? null : x * 3.6)),
  },
  /** total precipitation in the last interval [kg/m² = mm] */
  tp: { smet: "PSUM" },
  /** snowfall in the last interval [kg/m² snow water equivalent] → accumulated new snow height [cm] */
  sf: {
    smet: "NS",
    convert: (s) =>
      incrementToAccumulated(s).map((x) => (x === null ? null : sweToSnowHeightCm(x))),
    percentiles: true,
  },
  /** surface global radiation [W/m²] */
  ssrd: { smet: "ISWR" },
} as const satisfies Record<string, Mapping>;

type GeosphereForecastKey = keyof typeof GEOSPHERE_FORECAST_MAPPING;

const PERCENTILES = ["p10", "p50", "p90"] as const;
type Percentile = (typeof PERCENTILES)[number];

type GeosphereForecastParameter = `${GeosphereForecastKey}_${Percentile}`;

const GEOSPHERE_FORECAST_KEYS = Object.keys(GEOSPHERE_FORECAST_MAPPING) as GeosphereForecastKey[];

const GEOSPHERE_FORECAST_PARAMETERS: GeosphereForecastParameter[] = GEOSPHERE_FORECAST_KEYS.flatMap(
  (key) => {
    const mapping: Mapping = GEOSPHERE_FORECAST_MAPPING[key];
    return (mapping.percentiles ? PERCENTILES : (["p50"] as const)).map(
      (p) => `${key}_${p}` as const,
    );
  },
);

const GeosphereForecastSchema = createGeosphereForecastSchema(GEOSPHERE_FORECAST_PARAMETERS);

export const GEOSPHERE_BBOX_OUTER = {
  minLat: 42.9975,
  minLon: 5.02495,
  maxLat: 51.5025,
  maxLon: 22.57495,
};

type ForecastData = {
  timestamps: number[];
  /** median (50th percentile) */
  values: ValuesInput;
  /** 10th percentile, only for parameters with `percentiles` */
  p10: ValuesInput;
  /** 90th percentile, only for parameters with `percentiles` */
  p90: ValuesInput;
};

function vectorToSpeedKmH(u: number | null, v: number | null): number | null {
  if (u === null || v === null) {
    return null;
  }
  return Math.sqrt(u * u + v * v) * 3.6;
}

function vectorToDirectionDeg(u: number | null, v: number | null): number | null {
  if (u === null || v === null) {
    return null;
  }
  // Meteorological wind direction: where wind comes from, clockwise from north.
  return (270 - (Math.atan2(v, u) * 180) / Math.PI + 360) % 360;
}

function incrementToAccumulated(values: Series): Series {
  let sum = 0;
  return values.map((value) => {
    if (value === null) {
      return null;
    }
    sum += value;
    return sum;
  });
}

export async function fetchGeosphereForecast(latlon: string): Promise<ForecastData> {
  const url =
    `${GEOSPHERE_FORECAST_BASE_URL}?lat_lon=${encodeURIComponent(latlon)}` +
    `&parameters=${GEOSPHERE_FORECAST_PARAMETERS.join(",")}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Geosphere forecast: ${response.status} ${response.statusText}`,
    );
  }

  const parsed = v.parse(GeosphereForecastSchema, await response.json());
  const parameters = parsed.features[0].properties.parameters;
  const timestamps = parsed.timestamps.map((t) => Date.parse(t));
  const data = (key: GeosphereForecastKey, p: Percentile) => parameters[`${key}_${p}`]?.data;

  const valuesOf = (p: Percentile): ValuesInput => {
    const values: ValuesInput = {};
    for (const key of GEOSPHERE_FORECAST_KEYS) {
      const mapping: Mapping = GEOSPHERE_FORECAST_MAPPING[key];
      const series = data(key, p);
      if (!mapping.smet || !series) {
        continue;
      }
      values[mapping.smet] = mapping.convert ? mapping.convert(series) : series;
    }
    return values;
  };

  const values = valuesOf("p50");
  const u10 = data("10u", "p50");
  const v10 = data("10v", "p50");
  if (u10 && v10) {
    values.VW = u10.map((u, i) => vectorToSpeedKmH(u, v10[i] ?? null));
    values.DW = u10.map((u, i) => vectorToDirectionDeg(u, v10[i] ?? null));
  }

  const p10 = valuesOf("p10");
  const p90 = valuesOf("p90");
  const wind = windSpeedRangeKmH(
    data("10u", "p10"),
    data("10u", "p90"),
    data("10v", "p10"),
    data("10v", "p90"),
  );
  if (wind) {
    p10.VW = wind.min;
    p90.VW = wind.max;
  }

  return { timestamps, values, p10, p90 };
}

/**
 * The ensemble provides percentiles of the wind components only, not of the wind speed.
 * Approximates the wind speed spread by the range of speeds spanned by the 10th–90th percentile
 * box of the u/v components: from its point closest to calm (0 if the box contains it) to its
 * corner farthest from it [km/h].
 */
function windSpeedRangeKmH(
  u10: Series | undefined,
  u90: Series | undefined,
  v10: Series | undefined,
  v90: Series | undefined,
): { min: Series; max: Series } | undefined {
  if (!u10 || !u90 || !v10 || !v90) {
    return undefined;
  }
  const min: Series = [];
  const max: Series = [];
  for (let i = 0; i < u10.length; i++) {
    const [uLo, uHi, vLo, vHi] = [u10[i], u90[i], v10[i], v90[i]];
    if (uLo == null || uHi == null || vLo == null || vHi == null) {
      min.push(null);
      max.push(null);
      continue;
    }
    // closest distance of each interval to 0, and farthest
    const uNear = uLo > 0 ? uLo : uHi < 0 ? -uHi : 0;
    const vNear = vLo > 0 ? vLo : vHi < 0 ? -vHi : 0;
    const uFar = Math.max(Math.abs(uLo), Math.abs(uHi));
    const vFar = Math.max(Math.abs(vLo), Math.abs(vHi));
    min.push(Math.hypot(uNear, vNear) * 3.6);
    max.push(Math.hypot(uFar, vFar) * 3.6);
  }
  return { min, max };
}
