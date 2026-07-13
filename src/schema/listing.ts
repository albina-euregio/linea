import * as v from "valibot";
import {
  Intensity,
  Length,
  Pressure,
  Scalar,
  Speed,
  Temperature,
  Precipitation,
  UnitSchema,
} from "../data/units";
import { ProviderIdentifierSchema } from "../data/provider";
import { ParameterTypeSchema } from "../data/station-data";
export { ParameterTypeSchema, type ParameterType } from "../data/station-data";
export { UnitSchema, type Unit } from "../data/units";

export const ListingParameterTypeSchema = v.picklist([
  ...ParameterTypeSchema.options,
  "HSD_6",
  "HSD_24",
  "HSD_48",
  "HSD_72",
  "TA_MAX",
  "TA_MIN",
  "PSUM_6",
  "PSUM_24",
  "PSUM_48",
  "PSUM_72",
]);
export type ListingParameterType = v.InferOutput<typeof ListingParameterTypeSchema>;

const number = v.pipe(
  v.nullish(v.number()),
  v.transform((value) => (value === -777 ? undefined : value)),
);

export const StatisticsSchema = v.object({
  unit: v.nullish(UnitSchema),
  count: number,
  min: number,
  average: number,
  median: number,
  max: number,
  sum: number,
  delta: number,
});

export const FeaturePropertiesSchema = v.pipe(
  v.object({
    name: v.pipe(v.string(), v.description("Station name")),
    shortName: v.nullish(
      v.pipe(
        v.string(),
        v.regex(/^[A-Za-z0-9]+$/),
        v.description("Station short name (such as ISEE2) consisting of [A-Za-z0-9] only"),
      ),
    ),

    microRegionID: v.nullish(
      v.pipe(
        v.string(),
        v.description("EAWS micro region ID, see https://gitlab.com/eaws/eaws-regions"),
      ),
    ),
    stationCharacteristics: v.nullish(
      v.pipe(
        v.string(),
        v.description(
          "A few sentences describing the station characteristics/locality/history/...",
        ),
      ),
    ),
    altitude: v.nullish(
      v.pipe(
        v.number(),
        v.description(
          "Altitude above sea level (alternatively specify 3rd component in coordinates)",
        ),
      ),
    ),
    startYear: v.nullish(v.pipe(v.string(), v.description("Observation start year"))),

    operator: v.nullish(v.pipe(v.string(), v.description("Station operator"))),
    operatorLink: v.nullish(
      v.pipe(v.string(), v.url(), v.description("Link to website of station operator")),
    ),
    operatorLicense: v.nullish(
      v.pipe(v.string(), v.description("License under which data is provided")),
    ),
    operatorLicenseLink: v.nullish(v.pipe(v.string(), v.url(), v.description("Link to license"))),

    plot: v.nullish(
      v.pipe(
        v.string(),
        v.description("For legacy PNG plots: name of plot which includes this station"),
      ),
    ),

    dataProviderID: v.nullish(ProviderIdentifierSchema),
    dataURLs: v.nullish(
      v.pipe(
        v.array(v.pipe(v.string(), v.url())),
        v.description(
          "Data URLs for this station (typically SMET format is used, and three URLs are provided, short term, winter season, all winter seasons)",
        ),
      ),
    ),

    statistics: v.nullish(v.record(ParameterTypeSchema, StatisticsSchema)),

    date: v.pipe(v.nullish(v.pipe(v.unknown(), v.toDate())), v.description("ISO 8601 timestamp")),
    ISWR: v.pipe(
      number,
      v.description("Incoming Short Wave Radiation in W/m²"),
      v.transform((value) => new Intensity(value, "W/m²")),
      v.metadata({ unit: "W/m²" }),
    ),
    RSWR: v.pipe(
      number,
      v.description("Reflected Short Wave Radiation in W/m²"),
      v.transform((value) => new Intensity(value, "W/m²")),
      v.metadata({ unit: "W/m²" }),
    ),
    ILWR: v.pipe(
      number,
      v.description("Incoming Long Wave Radiation in W/m²"),
      v.transform((value) => new Intensity(value, "W/m²")),
      v.metadata({ unit: "W/m²" }),
    ),
    OLWR: v.pipe(
      number,
      v.description("Outgoing Long Wave Radiation in W/m²"),
      v.transform((value) => new Intensity(value, "W/m²")),
      v.metadata({ unit: "W/m²" }),
    ),
    HS: v.pipe(
      number,
      v.description("Snow height in m"),
      v.transform((value) => new Length(value, "m")),
      v.metadata({ unit: "m" }),
    ),
    HSD_6: v.pipe(
      number,
      v.description("Difference in snow height over the last 6h in m"),
      v.transform((value) => new Length(value, "m")),
      v.metadata({ unit: "m" }),
    ),
    HSD_24: v.pipe(
      number,
      v.description("Difference in snow height over the last 24h in m"),
      v.transform((value) => new Length(value, "m")),
      v.metadata({ unit: "m" }),
    ),
    HSD_48: v.pipe(
      number,
      v.description("Difference in snow height over the last 48h in m"),
      v.transform((value) => new Length(value, "m")),
      v.metadata({ unit: "m" }),
    ),
    HSD_72: v.pipe(
      number,
      v.description("Difference in snow height over the last 72h in m"),
      v.transform((value) => new Length(value, "m")),
      v.metadata({ unit: "m" }),
    ),
    P: v.pipe(
      number,
      v.description("Air pressure in Pa"),
      v.transform((value) => new Pressure(value, "Pa")),
      v.metadata({ unit: "Pa" }),
    ),
    TA_MAX: v.pipe(
      number,
      v.description("Max. air temperature over the last 24h in Kelvin"),
      v.transform((value) => new Temperature(value, "K")),
      v.metadata({ unit: "K" }),
    ),
    TA_MIN: v.pipe(
      number,
      v.description("Min. air temperature over the last 24h in Kelvin"),
      v.transform((value) => new Temperature(value, "K")),
      v.metadata({ unit: "K" }),
    ),
    TA: v.pipe(
      number,
      v.description("Air temperature in Kelvin"),
      v.transform((value) => new Temperature(value, "K")),
      v.metadata({ unit: "K" }),
    ),
    PSUM_6: v.pipe(
      number,
      v.description("Precipitation summed over the last 6h in mm"),
      v.transform((value) => new Precipitation(value, "mm")),
      v.metadata({ unit: "mm" }),
    ),
    PSUM_24: v.pipe(
      number,
      v.description("Precipitation summed over the last 24h in mm"),
      v.transform((value) => new Precipitation(value, "mm")),
      v.metadata({ unit: "mm" }),
    ),
    PSUM_48: v.pipe(
      number,
      v.description("Precipitation summed over the last 48h in mm"),
      v.transform((value) => new Precipitation(value, "mm")),
      v.metadata({ unit: "mm" }),
    ),
    PSUM_72: v.pipe(
      number,
      v.description("Precipitation summed over the last 72h in mm"),
      v.transform((value) => new Precipitation(value, "mm")),
      v.metadata({ unit: "mm" }),
    ),
    TSS: v.pipe(
      number,
      v.description("Temperature Snow Surface in Kelvin"),
      v.transform((value) => new Temperature(value, "K")),
      v.metadata({ unit: "K" }),
    ),
    RH: v.pipe(
      number,
      v.description("Relative humidity between 0 and 1"),
      v.transform((value) => new Scalar(value, "1")),
      v.metadata({ unit: "1" }),
    ),
    TD: v.pipe(
      number,
      v.description("Dew point temperature in Kelvin"),
      v.transform((value) => new Temperature(value, "K")),
      v.metadata({ unit: "K" }),
    ),
    VW_MAX: v.pipe(
      number,
      v.description("Max. wind velocity (optionally max over the last 3h) in m/s"),
      v.transform((value) => new Speed(value, "m/s")),
      v.metadata({ unit: "m/s" }),
    ),
    VW: v.pipe(
      number,
      v.description("Wind velocity (optionally as average over the last 3h) in m/s"),
      v.transform((value) => new Speed(value, "m/s")),
      v.metadata({ unit: "m/s" }),
    ),
    DW: v.pipe(
      number,
      v.description("Wind direction (optionally average over the last 3h) in °"),
      v.transform((value) => new Scalar(value, "°")),
      v.metadata({ unit: "°" }),
    ),
  }),
  v.description("The properties of a weather station including measured values"),
);

export const GeometrySchema = v.object({
  type: v.picklist(["Point"]),
  coordinates: v.union([
    v.strictTuple([
      v.pipe(v.number(), v.description("Longitude")),
      v.pipe(v.number(), v.description("Latitude")),
    ]),
    v.strictTuple([
      v.pipe(v.number(), v.description("Longitude")),
      v.pipe(v.number(), v.description("Latitude")),
      v.pipe(v.number(), v.description("Altitude")),
    ]),
  ]),
});

export const FeatureSchema = v.pipe(
  v.object({
    type: v.picklist(["Feature"]),
    geometry: GeometrySchema,
    properties: FeaturePropertiesSchema,
    id: v.pipe(
      v.union([v.pipe(v.string(), v.uuid()), v.string()]),
      v.description("The ID/UUID of the station"),
    ),
  }),
  v.description("A GeoJSON Feature corresponding to one weather station"),
);

export const FeatureCollectionSchema = v.pipe(
  v.object({
    type: v.picklist(["FeatureCollection"]),
    features: v.array(FeatureSchema),
    properties: v.nullish(v.any()),
  }),
  v.description("A GeoJSON FeatureCollection of weather stations"),
);

export type Statistics = v.InferOutput<typeof StatisticsSchema>;
export type Feature = v.InferOutput<typeof FeatureSchema>;
export type FeatureCollection = v.InferOutput<typeof FeatureCollectionSchema>;
