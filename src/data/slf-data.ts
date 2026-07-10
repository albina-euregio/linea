import { StationData } from "./station-data";
import { dewPoint } from "../linea-plot/dew-point";
import type { ParameterType, Units, Values } from "./station-data";
import * as v from "valibot";
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

export const SLFStationDataSchema = v.object({
  station_code: v.string(),
  measure_date: v.string(),
  HS: v.optional(v.nullable(v.number())),
  TA_30MIN_MEAN: v.optional(v.nullable(v.number())),
  RH_30MIN_MEAN: v.optional(v.nullable(v.number())),
  TSS_30MIN_MEAN: v.optional(v.nullable(v.number())),
  RSWR_30MIN_MEAN: v.optional(v.nullable(v.number())),
  VW_30MIN_MEAN: v.optional(v.nullable(v.number())),
  VW_30MIN_MAX: v.optional(v.nullable(v.number())),
  DW_30MIN_MEAN: v.optional(v.nullable(v.number())),
});
export type SLFStationData = v.InferOutput<typeof SLFStationDataSchema>;

export const SLFStationMetadataSchema = v.object({
  code: v.string(),
  label: v.string(),
  elevation: v.number(),
  lon: v.number(),
  lat: v.number(),
  country_code: v.optional(v.string()),
  canton_code: v.optional(v.string()),
  type: v.optional(v.string()),
});
export type SLFStationMetadata = v.InferOutput<typeof SLFStationMetadataSchema>;

const SLFCurrentStationFeatureSchema = v.object({
  type: v.picklist(["Feature"]),
  properties: v.object({
    code: v.string(),
    timestamp: v.optional(v.nullable(v.pipe(v.unknown(), v.toDate()))),
    value: v.optional(v.nullable(v.number())),
    velocity: v.optional(v.nullable(v.number())),
    direction: v.optional(v.nullable(v.number())),
  }),
});
type Feature = v.InferOutput<typeof SLFCurrentStationFeatureSchema>;

export const SLFStationCollectionSchema = v.object({
  type: v.picklist(["FeatureCollection"]),
  features: v.pipe(
    v.array(SLFCurrentStationFeatureSchema),
    v.transform((features) =>
      features.filter(
        (f) =>
          typeof f.properties.value === "number" ||
          typeof f.properties.velocity === "number" ||
          typeof f.properties.direction === "number",
      ),
    ),
    v.transform((features) =>
      features.reduce(
        (map, f) => map.set(f.properties.code, f),
        new Map<Feature["properties"]["code"], Feature>(),
      ),
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
      .then((j) => v.parseAsync(v.array(SLFStationMetadataSchema), j));
    const SNOW_HEIGHT = await fetchOrThrow(URL.SNOW_HEIGHT)
      .then((r) => r.json())
      .then((j) => v.parseAsync(SLFStationCollectionSchema, j));
    const TEMPERATURE_AIR = await fetchOrThrow(URL.TEMPERATURE_AIR)
      .then((r) => r.json())
      .then((j) => v.parseAsync(SLFStationCollectionSchema, j));
    const TEMPERATURE_SNOW_SURFACE = await fetchOrThrow(URL.TEMPERATURE_SNOW_SURFACE)
      .then((r) => r.json())
      .then((j) => v.parseAsync(SLFStationCollectionSchema, j));
    const WIND_MEAN = await fetchOrThrow(URL.WIND_MEAN)
      .then((r) => r.json())
      .then((j) => v.parseAsync(SLFStationCollectionSchema, j));

    const features = metadata.map((station) => {
      const feature = v.parse(listing.FeatureSchema, {
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
      } satisfies v.InferOutput<typeof listing.FeatureSchema>);
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
