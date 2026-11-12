import * as v from "valibot";
import type { ParameterType, ValuesInput } from "./station-data";
import { createGeosphereForecastSchema } from "../schema/geosphere-forecast";

// GeoSphere Austria – C-LAEF ensemble forecast (median / 50th percentile)
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

/**
 * Direct mapping from GeoSphere forecast parameters to SMET parameters.
 * Wind direction is derived separately from the u/v components.
 */
const GEOSPHERE_FORECAST_MAPPING = {
  /** 2m temperature [°C] */
  "2t_p50": { smet: "TA" },
  /** relative humidity 2m [%] */
  "2r_p50": { smet: "RH" },
  /** 10m wind eastward [m/s] */
  "10u_p50": {},
  /** 10m wind northward [m/s] */
  "10v_p50": {},
  /** maximum 10m wind gust in the last interval [m/s] → km/h */
  "10fg_p50": {
    smet: "VW_MAX",
    convert: (s) => s.map((x) => (x === null ? null : x * 3.6)),
  },
  /** total precipitation in the last interval [kg/m² = mm] */
  tp_p50: { smet: "PSUM" },
  /** snowfall in the last interval [kg/m² snow water equivalent] → accumulated new snow height [cm] */
  sf_p50: {
    smet: "NS",
    convert: (s) =>
      incrementToAccumulated(s).map((x) => (x === null ? null : sweToSnowHeightCm(x))),
  },
  /** surface global radiation [W/m²] */
  ssrd_p50: { smet: "ISWR" },
} as const satisfies Record<string, { smet?: ParameterType; convert?: (s: Series) => Series }>;

type GeosphereForecastParameter = keyof typeof GEOSPHERE_FORECAST_MAPPING;

const GEOSPHERE_FORECAST_PARAMETERS = Object.keys(
  GEOSPHERE_FORECAST_MAPPING,
) as GeosphereForecastParameter[];

const GeosphereForecastSchema = createGeosphereForecastSchema(GEOSPHERE_FORECAST_PARAMETERS);

export const GEOSPHERE_BBOX_OUTER = {
  minLat: 42.9975,
  minLon: 5.02495,
  maxLat: 51.5025,
  maxLon: 22.57495,
};

type ForecastData = {
  timestamps: number[];
  values: ValuesInput;
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

  const values: ValuesInput = {};
  for (const key of GEOSPHERE_FORECAST_PARAMETERS) {
    const mapping: { smet?: ParameterType; convert?: (s: Series) => Series } =
      GEOSPHERE_FORECAST_MAPPING[key];
    const data = parameters[key]?.data;
    if (!mapping.smet || !data) {
      continue;
    }
    values[mapping.smet] = mapping.convert ? mapping.convert(data) : data;
  }

  const u10 = parameters["10u_p50"]?.data;
  const v10 = parameters["10v_p50"]?.data;
  if (u10 && v10) {
    values.VW = u10.map((u, i) => vectorToSpeedKmH(u, v10[i] ?? null));
    values.DW = u10.map((u, i) => vectorToDirectionDeg(u, v10[i] ?? null));
  }

  return { timestamps, values };
}
