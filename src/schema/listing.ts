import { z } from "zod";

const number = z
  .number()
  .nullish()
  .check(z.overwrite((v) => (v === -777 ? undefined : v)));

export const FeaturePropertiesSchema = z
  .object({
    name: z.string().describe("Station name"),
    shortName: z
      .string()
      .regex(/^[A-Za-z0-9]+$/)
      .nullish()
      .describe("Station short name (such as ISEE2) consisting of [A-Za-z0-9] only"),

    microRegionID: z
      .string()
      .nullish()
      .describe("EAWS micro region ID, see https://gitlab.com/eaws/eaws-regions"),
    stationCharacteristics: z
      .string()
      .nullish()
      .describe("A few sentences describing the station characteristics/locality/history/..."),
    altitude: z
      .number()
      .nullish()
      .describe("Altitude above sea level (alternatively specify 3rd component in coordinates)"),
    startYear: z.string().nullish().describe("Observation start year"),

    operator: z.string().nullish().describe("Station operator"),
    operatorLink: z.url().nullish().describe("Link to website of station operator"),

    plot: z
      .string()
      .nullish()
      .describe("For legacy PNG plots: name of plot which includes this station"),

    date: z.coerce.date().nullish().describe("ISO 8601 timestamp"),
    ISWR: number.describe("Incoming Short Wave Radiation in W/m²").meta({ unit: "W/m²" }),
    RSWR: number.describe("Reflected Short Wave Radiation in W/m²").meta({ unit: "W/m²" }),
    ILWR: number.describe("Incoming Long Wave Radiation in W/m²").meta({ unit: "W/m²" }),
    OLWR: number.describe("Outgoing Long Wave Radiation in W/m²").meta({ unit: "W/m²" }),
    HS: number.describe("Snow height in m").meta({ unit: "m" }),
    HSD24: number.describe("Difference in snow height over the last 24h in m").meta({ unit: "m" }),
    HSD48: number.describe("Difference in snow height over the last 48h in m").meta({ unit: "m" }),
    HSD72: number.describe("Difference in snow height over the last 72h in m").meta({ unit: "m" }),
    P: number.describe("Air pressure in Pa").meta({ unit: "Pa" }),
    TA_MAX: number.describe("Max. air temperature over the last 24h in Kelvin").meta({ unit: "K" }),
    TA_MIN: number.describe("Min. air temperature over the last 24h in Kelvin").meta({ unit: "K" }),
    TA: number.describe("Air temperature in Kelvin").meta({ unit: "K" }),
    PSUM_24: number.describe("Precipitation summed over the last 24h in mm").meta({ unit: "mm" }),
    PSUM_48: number.describe("Precipitation summed over the last 48h in mm").meta({ unit: "mm" }),
    PSUM_6: number.describe("Precipitation summed over the last 6h in mm").meta({ unit: "mm" }),
    PSUM_72: number.describe("Precipitation summed over the last 72h in mm").meta({ unit: "mm" }),
    TSS: number.describe("Temperature Snow Surface in Kelvin").meta({ unit: "K" }),
    RH: number.describe("Relative humidity between 0 and 1"),
    TD: number.describe("Dew point temperature in Kelvin").meta({ unit: "K" }),
    VW_MAX: number
      .describe("Max. wind velocity (optionally max over the last 3h) in m/s")
      .meta({ unit: "m/s" }),
    VW: number
      .describe("Wind velocity (optionally as average over the last 3h) in m/s")
      .meta({ unit: "m/s" }),
    DW: number
      .describe("Wind direction (optionally average over the last 3h) in °")
      .meta({ unit: "°" }),
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
