import type { Values } from "./station-data";
import { GeosphereForecastSchema } from "../schema/geosphere-forecast";

const GEOSPHERE_FORECAST_BASE_URL =
  "https://dataset.api.hub.geosphere.at/v1/timeseries/forecast/nwp-v1-1h-2500m";
const GEOSPHERE_FORECAST_PARAMETERS = "t2m,u10m,ugust,v10m,vgust,rh2m,rr_acc,snow_acc";

export const GEOSPHERE_BBOX_OUTER = {
  minLat: 42.96974998874999,
  minLon: 5.486749988749989,
  maxLat: 51.83025001125035,
  maxLon: 22.113250011249765,
};

type ForecastData = {
  timestamps: number[];
  values: Values;
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
  const deg = (270 - (Math.atan2(v, u) * 180) / Math.PI + 360) % 360;
  return deg;
}

function accumulatedToIncrement(values: (number | null)[]): (number | null)[] {
  if (values.length === 0) {
    return [];
  }
  const out: (number | null)[] = [values[0] ?? 0];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const current = values[i];
    if (prev === null || current === null) {
      out.push(null);
      continue;
    }
    out.push(Math.max(0, current - prev));
  }
  return out;
}

export async function fetchGeosphereForecast(latlon: string): Promise<ForecastData> {
  const url =
    `${GEOSPHERE_FORECAST_BASE_URL}?lat_lon=${encodeURIComponent(latlon)}` +
    `&parameters=${GEOSPHERE_FORECAST_PARAMETERS}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Geosphere forecast: ${response.status} ${response.statusText}`,
    );
  }

  const parsed = GeosphereForecastSchema.parse(await response.json(), { reportInput: true });
  const feature = parsed.features[0];
  const parameters = feature.properties.parameters;

  const timestamps = parsed.timestamps.map((t) => Date.parse(t));

  const ta = parameters.t2m?.data;
  const rh = parameters.rh2m?.data;
  const u10m = parameters.u10m?.data;
  const v10m = parameters.v10m?.data;
  const ugust = parameters.ugust?.data;
  const vgust = parameters.vgust?.data;
  const rrAcc = parameters.rr_acc?.data;
  const snowAcc = parameters.snow_acc?.data;

  const vw = u10m && v10m ? u10m.map((u, i) => vectorToSpeedKmH(u, v10m[i] ?? null)) : undefined;
  const vwMax =
    ugust && vgust ? ugust.map((u, i) => vectorToSpeedKmH(u, vgust[i] ?? null)) : undefined;
  const dw =
    u10m && v10m ? u10m.map((u, i) => vectorToDirectionDeg(u, v10m[i] ?? null)) : undefined;

  return {
    timestamps,
    values: {
      TA: ta,
      RH: rh,
      VW: vw,
      VW_MAX: vwMax,
      DW: dw,
      PSUM: rrAcc ? accumulatedToIncrement(rrAcc) : undefined,
      NS: snowAcc,
      ISWR: undefined,
    },
  };
}
