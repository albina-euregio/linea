import * as v from "valibot";
import { GEOSPHERE_BBOX_OUTER } from "../data/geosphere-forecast";
import { i18n } from "../i18n";

/** Forecast coordinates as `"lat,lon"` or `[lat, lon]`, normalized to `"lat,lon"` */
export const ForecastLatLonSchema = v.pipe(
  v.union([v.string(), v.tuple([v.number(), v.number()])]),
  v.transform((latlong) => (typeof latlong === "string" ? latlong : latlong.join(","))),
);

export const ForecastOptionSchema = v.pipe(
  v.object({
    /** Forecast model shown at the forecast marker; `label` defaults to AROME if `latlong` is set */
    model: v.optional(
      v.object({
        t0: v.optional(v.pipe(v.string(), v.toDate())),
        label: v.optional(
          v.object({
            upper: v.string(),
            lower: v.optional(v.string()),
          }),
        ),
        /** Moves the label from its default position, in CSS pixels */
        labelOffset: v.optional(
          v.object({
            x: v.optional(v.number()),
            y: v.optional(v.number()),
          }),
        ),
      }),
    ),
    /** Where to fetch the GeoSphere forecast for; omitted if the SMET file contains the forecast */
    latlong: v.optional(ForecastLatLonSchema),
  }),
  v.check(
    ({ model, latlong }) => model?.label !== undefined || latlong !== undefined,
    "Expected model.label or latlong.",
  ),
);
export type ForecastOption = v.InferOutput<typeof ForecastOptionSchema>;

/**
 * Parse the forecast attribute, which is a stringified {@link ForecastOption}:
 * - A single object: `{"latlong":"48.5,11.3"}` (applies to all stations)
 * - An array: `[{"latlong":"48.5,11.3"}, null, {"model":{"label":{"upper":"My model"}}}]`
 *   (one per station; a single entry applies to all stations; `null` for stations without forecast)
 *
 * Every returned option has a `model`: without one, the GeoSphere AROME model is used.
 */
export function parseForecast(raw: string | null): (ForecastOption | undefined)[] {
  const value = raw?.trim();
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return (Array.isArray(parsed) ? parsed : [parsed]).map(parseForecastEntry);
  } catch {
    console.warn("Invalid forecast JSON.", value);
    return [];
  }
}

function parseForecastEntry(entry: unknown): ForecastOption | undefined {
  if (entry === null) {
    return undefined;
  }

  const result = v.safeParse(ForecastOptionSchema, entry);
  if (!result.success) {
    console.warn("Invalid forecast.", entry, v.summarize(result.issues));
    return undefined;
  }

  const { model } = result.output;
  const latlong = result.output.latlong ? validateLatLon(result.output.latlong) : undefined;
  // the stored label describes the GeoSphere forecast, which needs valid coordinates
  if (!model?.label && !latlong) {
    return undefined;
  }
  return { model: defaultForecastModel(model), latlong };
}

/**
 * Parse the forecast-latlon attribute which can be:
 * - A single value: "48.5,11.3" (applies to all stations)
 * - An array: '["48.5,11.3", "47.2,10.8"]' (one per station)
 *
 * @deprecated use the forecast attribute, see {@link parseForecast}
 */
export function parseForecastLatLon(raw: string | null): (ForecastOption | undefined)[] {
  const value = raw?.trim();
  if (!value) {
    return [];
  }

  try {
    // Try to parse as JSON (array format)
    if (value.startsWith("[")) {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(forecastOptionOfLatLon);
      }
    }
  } catch {
    // Fall through to single value parsing
  }

  // Try to parse as single lat,lon value
  const option = forecastOptionOfLatLon(value);
  return option ? [option] : [];
}

function forecastOptionOfLatLon(value: unknown): ForecastOption | undefined {
  const latlong = typeof value === "string" ? validateLatLon(value) : undefined;
  return latlong ? { model: defaultForecastModel(), latlong } : undefined;
}

/** Fills in the stored GeoSphere AROME label, if the model does not define its own. */
function defaultForecastModel(model?: ForecastOption["model"]): ForecastOption["model"] {
  if (model?.label) {
    return model;
  }
  const message = i18n.message("linea:forecast:arome");
  const lowerStart = message.indexOf("(G");
  const label =
    lowerStart < 0
      ? { upper: message }
      : { upper: message.slice(0, lowerStart).trim(), lower: message.slice(lowerStart) };
  return { ...model, label };
}

/**
 * Validate and format a single lat,lon coordinate pair
 * @returns formatted "lat,lon" string or undefined if invalid
 */
function validateLatLon(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parts = trimmed.split(",").map((part) => part.trim());
  if (parts.length !== 2) {
    console.warn("Invalid forecast coordinates format. Expected 'lat,lon'.", trimmed);
    return undefined;
  }

  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.warn("Invalid forecast coordinates. Expected numeric values.", trimmed);
    return undefined;
  }

  const bbox = GEOSPHERE_BBOX_OUTER;
  const isInsideBbox =
    lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
  if (!isInsideBbox) {
    console.warn("Forecast coordinates are outside coverage bbox and will be ignored.", trimmed);
    return undefined;
  }

  return `${lat},${lon}`;
}
