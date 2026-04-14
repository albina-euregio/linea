import { z } from "zod";
import * as listing from "../schema/listing";
import { StationData } from "./station-data";

export const GeometrySchema = z.object({
  type: z.enum(["Point"]),
  coordinates: z.number().array(),
});

export const ParameterTypeSchema = z.enum(["TL", "FF", "FFX", "DD", "P", "RF", "SCHNEE", "TP"]);

export const ParameterValuesSchema = z.object({
  name: z.string(),
  unit: z.string(),
  data: z.number().nullable().array(),
});

export const PropertiesSchema = z.object({
  parameters: z.looseRecord(ParameterTypeSchema, ParameterValuesSchema),
  station: z.string(),
});

export const FeatureSchema = z.object({
  type: z.enum(["Feature"]),
  geometry: GeometrySchema,
  properties: PropertiesSchema,
});

export const FeatureCollectionSchema = z.object({
  media_type: z.string(),
  type: z.enum(["FeatureCollection"]),
  version: z.string(),
  timestamps: z.string().array(),
  features: FeatureSchema.array(),
});
export type FeatureCollection = z.infer<typeof FeatureCollectionSchema>;

export const ParameterSchema = z.object({
  name: z.string(),
  long_name: z.string(),
  desc: z.string(),
  unit: z.string(),
});
export type Parameter = z.infer<typeof ParameterSchema>;

export const StationSchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string(),
  state: z.string(),
  lat: z.number(),
  lon: z.number(),
  altitude: z.number(),
  valid_from: z.coerce.date(),
  valid_to: z.coerce.date(),
  has_sunshine: z.boolean(),
  has_global_radiation: z.boolean(),
  is_active: z.boolean(),
});
export type Station = z.infer<typeof StationSchema>;

export const MetadataSchema = z.object({
  title: z.string(),
  parameters: ParameterSchema.array(),
  frequency: z.string(),
  type: z.string(),
  mode: z.string(),
  response_formats: z.string().array(),
  start_time: z.string(),
  end_time: z.string(),
  stations: StationSchema.array(),
  id_type: z.string(),
});
export type Metadata = z.infer<typeof MetadataSchema>;

export function parseGeosphereData(metadata: Metadata, collection: FeatureCollection): StationData {
  if (collection?.features?.length !== 1) throw new Error();
  const feature = collection?.features?.[0];
  const station = metadata.stations.find((s) => s.id === feature.properties.station);
  const parameters = feature.properties.parameters;
  return new StationData(
    station.name ?? feature.properties.station,
    station?.altitude,
    collection.timestamps.map((t) => Date.parse(t)),
    {
      DW: parameters.DD?.unit,
      HS: parameters.SCHNEE?.unit,
      P: parameters.P?.unit,
      RH: parameters.RF?.unit,
      TA: parameters.TL?.unit,
      TD: parameters.TP?.unit,
      VW_MAX: parameters.FFX?.unit === "m/s" ? "km/h" : parameters.FFX?.unit,
      VW: parameters.FF?.unit === "m/s" ? "km/h" : parameters.FF?.unit,
    },
    {
      DW: parameters.DD?.data,
      HS: parameters.SCHNEE?.data,
      P: parameters.P?.data,
      RH: parameters.RF?.data,
      TA: parameters.TL?.data,
      TD: parameters.TP?.data,
      VW_MAX:
        parameters.FFX.unit === "m/s"
          ? parameters.FFX?.data.map((v) => v * 3.6)
          : parameters.FFX?.data,
      VW:
        parameters.FF.unit === "m/s"
          ? parameters.FF?.data.map((v) => v * 3.6)
          : parameters.FF?.data,
    },
  );
}

export function parseGeosphereFeature(station: Station) {
  return listing.FeatureSchema.parse({
    type: "Feature",
    id: station.id,
    geometry: {
      type: "Point",
      coordinates: [station.lon, station.lat, station.altitude],
    },
    properties: {
      name: station.name
        .toLocaleLowerCase("de")
        // capitalize "ACHENKIRCH CAMPINGPLATZ"
        .replace(/(^|[-./()\s])\w/g, (c) => c.toLocaleUpperCase("de")),
      operator: "GeoSphere Austria",
      operatorLink: "https://www.geosphere.at/",
      operatorLicense: "CC BY 4.0",
      operatorLicenseLink: "https://creativecommons.org/licenses/by/4.0/legalcode",
    },
  });
}
