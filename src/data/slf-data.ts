import { StationData } from "./station-data";
import { dewPoint } from "../linea-plot/dew-point";
import type { ParameterType, Units, Values } from "./station-data";
import { z } from "zod";
import * as listing from "../schema/listing";
import { Length, Scalar, Speed, Temperature } from "./units";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider } from "./provider";

export const URL = Object.freeze({
  STATIONS: "https://measurement-api.slf.ch/public/api/imis/stations",
  STATION: "https://measurement-api.slf.ch/public/api/imis/station/",
  SNOW_HEIGHT:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/SNOW_HEIGHT/current/geojson",
  TEMPERATURE_AIR:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/TEMPERATURE_AIR/current/geojson",
  TEMPERATURE_SNOW_SURFACE:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/TEMPERATURE_SNOW_SURFACE/current/geojson",
  WIND_MEAN:
    "https://public-meas-data-v2.slf.ch/public/station-data/timepoint/WIND_MEAN/current/geojson",
});

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
    timestamp: z.coerce.date().nullish(),
    value: z.number().nullish(),
    velocity: z.number().nullish(),
    direction: z.number().nullish(),
  }),
});
type Feature = z.infer<typeof SLFCurrentStationFeatureSchema>;

export const SLFStationCollectionSchema = z.object({
  type: z.enum(["FeatureCollection"]),
  features: z
    .array(SLFCurrentStationFeatureSchema)
    .transform((features) =>
      features.filter(
        (f) =>
          typeof f.properties.value === "number" ||
          typeof f.properties.velocity === "number" ||
          typeof f.properties.direction === "number",
      ),
    )
    .transform((features) =>
      features.reduce(
        (map, f) => map.set(f.properties.code, f),
        new Map<Feature["properties"]["code"], Feature>(),
      ),
    ),
});

export class SLFDataProvider implements LineaDataProvider {
  readonly dataProviderID = "SLF";
  readonly regions = ["CH", "LI"];

  async fetchStationData(station: listing.Feature, dataURLsIndex: number): Promise<StationData> {
    const dataURL = station.properties.dataURLs[dataURLsIndex];
    const response = await fetchOrThrow(dataURL);
    const collection: SLFStationData[] = await response.json();

    if (collection.length === 0) {
      throw new Error("No data");
    }
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
      station?.properties?.name,
      station?.geometry?.coordinates?.[2] as number,
      timestamps,
      units,
      values,
    );
  }

  async fetchStationListing(): Promise<listing.FeatureCollection> {
    const metadata = await fetchOrThrow(URL.STATIONS)
      .then((r) => r.json())
      .then((j) => SLFStationMetadataSchema.array().parseAsync(j));
    const SNOW_HEIGHT = await fetchOrThrow(URL.SNOW_HEIGHT)
      .then((r) => r.json())
      .then((j) => SLFStationCollectionSchema.parseAsync(j));
    const TEMPERATURE_AIR = await fetchOrThrow(URL.TEMPERATURE_AIR)
      .then((r) => r.json())
      .then((j) => SLFStationCollectionSchema.parseAsync(j));
    const TEMPERATURE_SNOW_SURFACE = await fetchOrThrow(URL.TEMPERATURE_SNOW_SURFACE)
      .then((r) => r.json())
      .then((j) => SLFStationCollectionSchema.parseAsync(j));
    const WIND_MEAN = await fetchOrThrow(URL.WIND_MEAN)
      .then((r) => r.json())
      .then((j) => SLFStationCollectionSchema.parseAsync(j));

    const features = metadata.map((station) => {
      const feature = listing.FeatureSchema.parse({
        type: "Feature",
        id: station.code,
        geometry: {
          type: "Point",
          coordinates: [station.lon, station.lat, station.elevation],
        },
        properties: {
          name: station.label,
          dataProviderID: this.dataProviderID,
          dataURLs: [`${URL.STATION}${station.code}/measurements?period_in_days=7`],
          microRegionID: station.country_code,
          operator: "SLF",
          operatorLink: "https://www.slf.ch/",
          operatorLicense: "CC BY 4.0",
          operatorLicenseLink: "https://www.slf.ch/de/services-und-produkte/slf-datenservice/",
        },
      } satisfies z.infer<typeof listing.FeatureSchema>);
      feature.properties.date =
        TEMPERATURE_AIR.features.get(feature.id)?.properties?.timestamp ??
        SNOW_HEIGHT.features.get(feature.id)?.properties?.timestamp;
      feature.properties.HS = new Length(
        SNOW_HEIGHT.features.get(feature.id)?.properties?.value ?? undefined,
        "cm",
      );
      feature.properties.TA = new Temperature(
        TEMPERATURE_AIR.features.get(feature.id)?.properties?.value ?? undefined,
        "℃",
      );
      feature.properties.TSS = new Temperature(
        TEMPERATURE_SNOW_SURFACE.features.get(feature.id)?.properties?.value ?? undefined,
        "℃",
      );
      feature.properties.VW = new Speed(
        WIND_MEAN.features.get(feature.id)?.properties?.velocity ?? undefined,
        "km/h",
      );
      feature.properties.DW = new Scalar(
        WIND_MEAN.features.get(feature.id)?.properties?.direction ?? undefined,
        "°",
      );

      return feature;
    });
    return { type: "FeatureCollection", features };
  }
}
