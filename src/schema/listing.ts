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
    microRegionID: z
      .string()
      .nullish()
      .describe("EAWS micro region ID, see https://gitlab.com/eaws/eaws-regions"),

    date: z.coerce.date().nullish().describe("ISO 8601 timestamp"),
    ISWR: number.describe("Incoming Short Wave Radiation in W/m²"),
    RSWR: number.describe("Outgoing Short Wave Radiation in W/m²"),
    HS: number.describe("Snow height in m"),
    HSD24: number.describe("Difference in snow height over the last 24h in m"),
    HSD48: number.describe("Difference in snow height over the last 48h in m"),
    HSD72: number.describe("Difference in snow height over the last 72h in m"),
    P: number.describe("Air pressure in Pa"),
    TA_MAX: number.describe("Max. air temperature over the last 24h in Kelvin"),
    TA_MIN: number.describe("Min. air temperature over the last 24h in Kelvin"),
    TA: number.describe("Air temperature in Kelvin"),
    PSUM_24: number.describe("Precipitation summed over the last 24h in mm"),
    PSUM_48: number.describe("Precipitation summed over the last 48h in mm"),
    PSUM_6: number.describe("Precipitation summed over the last 6h in mm"),
    PSUM_72: number.describe("Precipitation summed over the last 72h in mm"),
    TSS: number.describe("Temperature Snow Surface in Kelvin"),
    RH: number.describe("Relative humidity between 0 and 1"),
    TD: number.describe("Dew point temperature in Kelvin"),
    VW_MAX: number.describe("Max. wind velocity (optionally max over the last 3h) in m/s"),
    VW: number.describe("Wind velocity (optionally as average over the last 3h) in m/s"),
    DW: number.describe("Wind direction (optionally average over the last 3h) in °"),
  })
  .describe("The properties of a weather station including measured values");

export const FeatureSchema = z
  .object({
    type: z.enum(["Feature"]),
    geometry: z.union([
      z.tuple([z.number().describe("Longitude"), z.number().describe("Latitude")]),
      z.tuple([
        z.number().describe("Longitude"),
        z.number().describe("Latitude"),
        z.number().describe("Altitude"),
      ]),
    ]),
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
