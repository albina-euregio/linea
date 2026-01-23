import { z } from "zod";

const number = z
  .number()
  .nullish()
  .check(z.overwrite((v) => (v === -777 ? undefined : v)));

export const FeaturePropertiesSchema = z
  .object({
    name: z.string().describe("Station name"),
    altitude: z.number().nullish().describe("Altitude above sea level"),
    Beobachtungsbeginn: z.string().nullish().describe("Observation start year"),
    operator: z.string().nullish().describe("Station operator"),
    operatorLink: z.url().nullish().describe("Link to website of station operator"),
    plot: z
      .string()
      .nullish()
      .describe("For legacy PNG plots: name of plot which includes this station"),
    "LWD-Nummer": z
      .string()
      .nullish()
      .describe("Station number as defined by avalanche warning service"),
    "LWD-Region": z
      .string()
      .nullish()
      .describe("Station region as defined by avalanche warning service"),

    date: z.coerce.date().nullish().describe("ISO 8601 timestamp"),
    GS_O: number.describe("Incoming radiation in W/m²").meta({ unit: "W/m²" }),
    GS_U: number.describe("Outgoing radiation in W/m²").meta({ unit: "W/m²" }),
    HS: number.describe("Snow height in cm").meta({ unit: "cm" }),
    HSD24: number
      .describe("Difference in snow height over the last 24h in cm")
      .meta({ unit: "cm" }),
    HSD48: number
      .describe("Difference in snow height over the last 48h in cm")
      .meta({ unit: "cm" }),
    HSD72: number
      .describe("Difference in snow height over the last 72h in cm")
      .meta({ unit: "cm" }),
    LD: number.describe("Air pressure in hPa").meta({ unit: "hPa" }),
    LT_MAX: number.describe("Max. air temperature over the last 24h in °C").meta({ unit: "°C" }),
    LT_MIN: number.describe("Min. air temperature over the last 24h in °C").meta({ unit: "°C" }),
    LT: number.describe("Air temperature in °C").meta({ unit: "°C" }),
    N24: number.describe("Precipitation over the last 24h in mm").meta({ unit: "mm" }),
    N48: number.describe("Precipitation over the last 48h in mm").meta({ unit: "mm" }),
    N6: number.describe("Precipitation over the last 6h in mm").meta({ unit: "mm" }),
    N72: number.describe("Precipitation over the last 72h in mm").meta({ unit: "mm" }),
    OFT: number.describe("Surface temperature in °C").meta({ unit: "°C" }),
    RH: number.describe("Relative humidity in %").meta({ unit: "%" }),
    TD: number.describe("Dew point temperature in °C").meta({ unit: "°C" }),
    WG_BOE: number
      .describe("Max. wind velocity (max over the last 3h) in km/h")
      .meta({ unit: "km/h" }),
    WG: number.describe("Wind velocity (average over the last 3h) in km/h").meta({ unit: "km/h" }),
    WR: number.describe("Wind direction (average over the last 3h) in °").meta({ unit: "°" }),
  })
  .describe("The properties of a weather station including measured values");

export const GeometrySchema = z.object({
  type: z.enum(["Point"]),
  coordinates: z.union([
    z.tuple([z.number().describe("Longitude"), z.number().describe("Latitude")]),
    z.tuple([
      z.number().describe("Longitude"),
      z.number().describe("Latitude"),
      z.number().describe("Altitude"),
    ]),
  ]),
});

export const FeatureSchema = z
  .object({
    type: z.enum(["Feature"]),
    geometry: GeometrySchema,
    properties: FeaturePropertiesSchema,
    id: z.union([z.uuid(), z.string()]).describe("The ID/UUID of the station"),
  })
  .describe("A GeoJSON Feature corresponding to one weather station");

export const FeatureCollectionSchema = z
  .object({
    type: z.enum(["FeatureCollection"]),
    features: z.array(FeatureSchema),
    properties: z.any(),
  })
  .describe("A GeoJSON FeatureCollection of weather stations");
