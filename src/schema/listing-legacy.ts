import { z } from "zod";
import { FeaturePropertiesSchema as ModernFeaturePropertiesSchema } from "./listing";
import { Intensity, Length, Pressure, Scalar, Speed, Temperature } from "../data/units";

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
    operatorLicense: z.string().nullish().describe("License under which data is provided"),
    operatorLicenseLink: z.url().nullish().describe("Link to license"),
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
    GS_O: number
      .describe("Incoming radiation in W/m²")
      .transform((v) => new Intensity(v, "W/m²"))
      .meta({ unit: "W/m²" }),
    GS_U: number
      .describe("Outgoing radiation in W/m²")
      .transform((v) => new Intensity(v, "W/m²"))
      .meta({ unit: "W/m²" }),
    HS: number
      .describe("Snow height in cm")
      .transform((v) => new Length(v, "cm"))
      .meta({ unit: "cm" }),
    HSD24: number
      .describe("Difference in snow height over the last 24h in cm")
      .transform((v) => new Length(v, "cm"))
      .meta({ unit: "cm" }),
    HSD48: number
      .describe("Difference in snow height over the last 48h in cm")
      .transform((v) => new Length(v, "cm"))
      .meta({ unit: "cm" }),
    HSD72: number
      .describe("Difference in snow height over the last 72h in cm")
      .transform((v) => new Length(v, "cm"))
      .meta({ unit: "cm" }),
    LD: number
      .describe("Air pressure in hPa")
      .transform((v) => new Pressure(v, "hPa"))
      .meta({ unit: "hPa" }),
    LT_MAX: number
      .describe("Max. air temperature over the last 24h in ℃")
      .transform((v) => new Temperature(v, "℃"))
      .meta({ unit: "℃" }),
    LT_MIN: number
      .describe("Min. air temperature over the last 24h in ℃")
      .transform((v) => new Temperature(v, "℃"))
      .meta({ unit: "℃" }),
    LT: number
      .describe("Air temperature in ℃")
      .transform((v) => new Temperature(v, "℃"))
      .meta({ unit: "℃" }),
    N24: number
      .describe("Precipitation over the last 24h in mm")
      .transform((v) => new Length(v, "mm"))
      .meta({ unit: "mm" }),
    N48: number
      .describe("Precipitation over the last 48h in mm")
      .transform((v) => new Length(v, "mm"))
      .meta({ unit: "mm" }),
    N6: number
      .describe("Precipitation over the last 6h in mm")
      .transform((v) => new Length(v, "mm"))
      .meta({ unit: "mm" }),
    N72: number
      .describe("Precipitation over the last 72h in mm")
      .transform((v) => new Length(v, "mm"))
      .meta({ unit: "mm" }),
    OFT: number
      .describe("Surface temperature in ℃")
      .transform((v) => new Temperature(v, "℃"))
      .meta({ unit: "℃" }),
    RH: number
      .describe("Relative humidity in %")
      .transform((v) => new Scalar(v, "%"))
      .meta({ unit: "%" }),
    TD: number
      .describe("Dew point temperature in ℃")
      .transform((v) => new Temperature(v, "℃"))
      .meta({ unit: "℃" }),
    WG_BOE: number
      .describe("Max. wind velocity (max over the last 3h) in km/h")
      .transform((v) => new Speed(v, "km/h"))
      .meta({ unit: "km/h" }),
    WG: number
      .describe("Wind velocity (average over the last 3h) in km/h")
      .transform((v) => new Speed(v, "km/h"))
      .meta({ unit: "km/h" }),
    WR: number
      .describe("Wind direction (average over the last 3h) in °")
      .transform((v) => new Scalar(v, "°"))
      .meta({ unit: "°" }),
  })
  .describe("The properties of a weather station including measured values")
  .transform((p) =>
    ModernFeaturePropertiesSchema.parse({
      ...p,
      startYear: p.Beobachtungsbeginn,
      shortName: p["LWD-Nummer"],
      microRegionID: p["LWD-Region"],
      ISWR: p.GS_O.convertTo(ModernFeaturePropertiesSchema.shape.ISWR.meta().unit as "W/m²"),
      RSWR: p.GS_U.convertTo(ModernFeaturePropertiesSchema.shape.RSWR.meta().unit as "W/m²"),
      HS: p.HS.convertTo(ModernFeaturePropertiesSchema.shape.HS.meta().unit as "m"),
      HSD_24: p.HSD24.convertTo(ModernFeaturePropertiesSchema.shape.HSD_24.meta().unit as "m"),
      HSD_48: p.HSD48.convertTo(ModernFeaturePropertiesSchema.shape.HSD_48.meta().unit as "m"),
      HSD_72: p.HSD72.convertTo(ModernFeaturePropertiesSchema.shape.HSD_72.meta().unit as "m"),
      P: p.LD.convertTo(ModernFeaturePropertiesSchema.shape.P.meta().unit as "Pa"),
      TA_MAX: p.LT_MAX.convertTo(ModernFeaturePropertiesSchema.shape.TA_MAX.meta().unit as "K"),
      TA_MIN: p.LT_MIN.convertTo(ModernFeaturePropertiesSchema.shape.TA_MIN.meta().unit as "K"),
      TA: p.LT.convertTo(ModernFeaturePropertiesSchema.shape.TA.meta().unit as "K"),
      PSUM_6: p.N6.convertTo(ModernFeaturePropertiesSchema.shape.PSUM_6.meta().unit as "mm"),
      PSUM_24: p.N24.convertTo(ModernFeaturePropertiesSchema.shape.PSUM_24.meta().unit as "mm"),
      PSUM_48: p.N48.convertTo(ModernFeaturePropertiesSchema.shape.PSUM_48.meta().unit as "mm"),
      PSUM_72: p.N72.convertTo(ModernFeaturePropertiesSchema.shape.PSUM_72.meta().unit as "mm"),
      TSS: p.OFT.convertTo(ModernFeaturePropertiesSchema.shape.TSS.meta().unit as "K"),
      RH: p.RH.convertTo(ModernFeaturePropertiesSchema.shape.RH.meta().unit as "1"),
      TD: p.TD.convertTo(ModernFeaturePropertiesSchema.shape.TD.meta().unit as "K"),
      VW_MAX: p.WG_BOE.convertTo(ModernFeaturePropertiesSchema.shape.VW_MAX.meta().unit as "m/s"),
      VW: p.WG.convertTo(ModernFeaturePropertiesSchema.shape.VW.meta().unit as "m/s"),
      DW: p.WR.convertTo(ModernFeaturePropertiesSchema.shape.DW.meta().unit as "°"),
    } satisfies z.input<typeof ModernFeaturePropertiesSchema>),
  );

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
