import { StationData } from "./station-data";
import { dewPoint } from "../linea-plot/dew-point";
import type { ParameterType, Units, Values } from "./station-data";
import { z } from "zod";
import * as listing from "../schema/listing";
import { Length, Scalar, Speed, Temperature } from "./units";

export const SLFStationDataSchema = z.object({
  station_code: z.string(),
  measure_date: z.string(),
  HS: z.number().nullish(),
  TA_30MIN_MEAN: z.number().nullish(),
  RH_30MIN_MEAN: z.number().nullish(),
  TSS_30MIN_MEAN: z.number().nullish(),
  RSWR_30MIN_MEAN: z.number().nullish(),
  VW_30MIN_MEAN: z.number().nullish(),
  VW_30MIN_MAX: z.number().nullish(),
  DW_30MIN_MEAN: z.number().nullish(),
});
export type SLFStationData = z.infer<typeof SLFStationDataSchema>;

export const SLFStationMetadataSchema = z.object({
  code: z.string(),
  label: z.string(),
  elevation: z.number(),
  lon: z.number(),
  lat: z.number(),
  country_code: z.string().optional(),
  canton_code: z.string().optional(),
  type: z.string().optional(),
});
export type SLFStationMetadata = z.infer<typeof SLFStationMetadataSchema>;

const SLFCurrentStationFeatureSchema = z.object({
  type: z.enum(["Feature"]),
  properties: z.object({
    code: z.string(),
    timestamp: z.string().nullish(),
    value: z.number().nullish(),
    velocity: z.number().nullish(),
    direction: z.number().nullish(),
  }),
});

export const SLFStationCollectionSchema = z.object({
  type: z.enum(["FeatureCollection"]),
  features: z.array(SLFCurrentStationFeatureSchema),
});

type SLFSingleValueMap = Record<string, { timestamp: string | null; value: number | null }>;
type SLFWindValueMap = Record<
  string,
  { timestamp: string | null; value: [number | null, number | null] }
>;

export function parseSLFAPIData(
  stationsMetadata: SLFStationMetadata[],
  collection: SLFStationData[],
): StationData {
  if (collection.length === 0) {
    throw new Error("No data");
  }
  const station = stationsMetadata.find((s) => s.code === collection[0].station_code);
  const timestamps = collection.map((entry) => Date.parse(entry.measure_date));

  const allSeries: Partial<Record<ParameterType, (number | null | undefined)[]>> = {
    DW: collection.map((entry) => entry.DW_30MIN_MEAN),
    HS: collection.map((entry) => entry.HS),
    RH: collection.map((entry) => entry.RH_30MIN_MEAN),
    TA: collection.map((entry) => entry.TA_30MIN_MEAN),
    TD: collection.map((entry) =>
      dewPoint(entry.TA_30MIN_MEAN ?? null, entry.RH_30MIN_MEAN ?? null),
    ),
    TSS: collection.map((entry) => entry.TSS_30MIN_MEAN),
    VW_MAX: collection.map((entry) => entry.VW_30MIN_MAX),
    VW: collection.map((entry) => entry.VW_30MIN_MEAN),
  };

  const unitsByParameter: Partial<Record<ParameterType, string>> = {
    DW: "°",
    HS: "cm",
    RH: "%",
    TA: "℃",
    TD: "℃",
    TSS: "℃",
    VW_MAX: "km/h",
    VW: "km/h",
  };

  const values: Values = {};
  const units: Units = {};

  for (const [parameter, series] of Object.entries(allSeries) as [
    ParameterType,
    (number | null | undefined)[],
  ][]) {
    if (!series?.some((value) => value != null)) {
      continue;
    }

    values[parameter] = series.map((value) => (value == null ? null : value));
    units[parameter] = unitsByParameter[parameter] ?? "";
  }

  return new StationData(
    station?.label ?? collection[0].station_code,
    station?.elevation ?? NaN,
    timestamps,
    units,
    values,
  );
}

export function parseSLFFeature(station: SLFStationMetadata) {
  return listing.FeatureSchema.parse({
    type: "Feature",
    id: station.code,
    geometry: {
      type: "Point",
      coordinates: [station.lon, station.lat, station.elevation],
    },
    properties: {
      name: station.label,
      operator: "SLF",
      operatorLink: "https://www.slf.ch/",
      operatorLicense: "CC BY 4.0",
      operatorLicenseLink: "https://www.slf.ch/de/services-und-produkte/slf-datenservice/",
    },
  } satisfies z.infer<typeof listing.FeatureSchema>);
}

export function mapSLFStationToFeature(
  station: SLFStationMetadata,
  HS: SLFSingleValueMap,
  TA: SLFSingleValueMap,
  TSS: SLFSingleValueMap,
  VW: SLFWindValueMap,
): z.infer<typeof listing.FeatureSchema> {
  const hsEntry = HS[station.code];
  const taEntry = TA[station.code];
  const tssEntry = TSS[station.code];
  const windEntry = VW[station.code];

  const hs = hsEntry?.value;
  const ta = taEntry?.value;
  const tss = tssEntry?.value;
  const wind = windEntry?.value;
  const windSpeed = wind?.[0];
  const windDirection = wind?.[1];
  const dateString =
    hsEntry?.timestamp ?? taEntry?.timestamp ?? tssEntry?.timestamp ?? windEntry?.timestamp;

  const feature = parseSLFFeature(station);
  return {
    ...feature,
    properties: {
      ...feature.properties,
      date: dateString ? new Date(dateString) : undefined,
      HS: new Length(typeof hs === "number" ? hs : undefined, "cm"),
      TA: new Temperature(typeof ta === "number" ? ta : undefined, "℃"),
      TSS: new Temperature(typeof tss === "number" ? tss : undefined, "℃"),
      VW: new Speed(typeof windSpeed === "number" ? windSpeed : undefined, "m/s"),
      DW: new Scalar(typeof windDirection === "number" ? windDirection : undefined, "°"),
    },
  } as unknown as z.infer<typeof listing.FeatureSchema>;
}

export async function parseSLFCurrentStationData(key: "WIND_MEAN"): Promise<SLFWindValueMap>;
export async function parseSLFCurrentStationData(
  key: "SNOW_HEIGHT" | "TEMPERATURE_AIR" | "TEMPERATURE_SNOW_SURFACE",
): Promise<SLFSingleValueMap>;
export async function parseSLFCurrentStationData(
  key: "SNOW_HEIGHT" | "TEMPERATURE_AIR" | "TEMPERATURE_SNOW_SURFACE" | "WIND_MEAN",
): Promise<SLFSingleValueMap | SLFWindValueMap> {
  const response = await fetch(
    `https://public-meas-data-v2.slf.ch/public/station-data/timepoint/${key}/current/geojson`,
    { cache: "no-cache" },
  );
  if (!response.ok) {
    throw new Error();
  }
  const collection = SLFStationCollectionSchema.parse(await response.json());

  if (key !== "WIND_MEAN") {
    const data: SLFSingleValueMap = {};
    for (const feature of collection.features) {
      if (feature.properties.value !== undefined && feature.properties.value !== null) {
        data[feature.properties.code] = {
          timestamp: feature.properties.timestamp ?? null,
          value: feature.properties.value,
        };
      }
    }
    return data;
  }

  const data: SLFWindValueMap = {};
  for (const feature of collection.features) {
    if (
      feature.properties.velocity !== undefined &&
      feature.properties.velocity !== null &&
      feature.properties.direction !== undefined &&
      feature.properties.direction !== null
    ) {
      data[feature.properties.code] = {
        timestamp: feature.properties.timestamp ?? null,
        value: [feature.properties.velocity, feature.properties.direction],
      };
    }
  }
  return data;
}

export async function mapAndFetchCurrentStationData(json: unknown) {
  const metadata = SLFStationMetadataSchema.array().parse(json);
  const HS = await parseSLFCurrentStationData("SNOW_HEIGHT");
  const TA = await parseSLFCurrentStationData("TEMPERATURE_AIR");
  const TSS = await parseSLFCurrentStationData("TEMPERATURE_SNOW_SURFACE");
  const VW = await parseSLFCurrentStationData("WIND_MEAN");
  return metadata.map((station) => mapSLFStationToFeature(station, HS, TA, TSS, VW));
}
