import * as v from "valibot";
import * as listing from "../schema/listing";
import { StationData } from "./station-data";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider } from "./provider";
import { UnitSchema } from "./units";

export const URL = "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min";

export const GeometrySchema = v.object({
  type: v.picklist(["Point"]),
  coordinates: v.array(v.number()),
});

export const ParameterTypeSchema = v.picklist(["TL", "FF", "FFX", "DD", "P", "RF", "SCHNEE", "TP"]);

export const ParameterValuesSchema = v.object({
  name: v.string(),
  unit: v.pipe(
    v.string(),
    v.transform((s) => (s === "°C" ? "℃" : s)),
    v.transform((s) => v.parse(UnitSchema, s)),
  ),
  data: v.array(v.nullable(v.number())),
});

export const PropertiesSchema = v.object({
  parameters: v.record(v.string(), ParameterValuesSchema),
  station: v.string(),
});

export const FeatureSchema = v.object({
  type: v.picklist(["Feature"]),
  geometry: GeometrySchema,
  properties: PropertiesSchema,
});

export const FeatureCollectionSchema = v.object({
  media_type: v.string(),
  type: v.picklist(["FeatureCollection"]),
  version: v.string(),
  timestamps: v.array(v.string()),
  features: v.array(FeatureSchema),
});
export type FeatureCollection = v.InferOutput<typeof FeatureCollectionSchema>;

export const ParameterSchema = v.object({
  name: v.string(),
  long_name: v.string(),
  desc: v.string(),
  unit: v.string(),
});
export type Parameter = v.InferOutput<typeof ParameterSchema>;

export const StationSchema = v.object({
  type: v.string(),
  id: v.string(),
  name: v.string(),
  state: v.string(),
  lat: v.number(),
  lon: v.number(),
  altitude: v.number(),
  valid_from: v.pipe(v.unknown(), v.toDate()),
  valid_to: v.pipe(v.unknown(), v.toDate()),
  has_sunshine: v.boolean(),
  has_global_radiation: v.boolean(),
  is_active: v.boolean(),
});
export type Station = v.InferOutput<typeof StationSchema>;

export const MetadataSchema = v.object({
  title: v.string(),
  parameters: v.array(ParameterSchema),
  frequency: v.string(),
  type: v.string(),
  mode: v.string(),
  response_formats: v.array(v.string()),
  start_time: v.pipe(v.unknown(), v.toDate()),
  end_time: v.pipe(v.unknown(), v.toDate()),
  stations: v.array(StationSchema),
  id_type: v.string(),
});
export type Metadata = v.InferOutput<typeof MetadataSchema>;

export class GeoSphereDataProvider implements LineaDataProvider {
  readonly dataProviderID = "GEOSPHERE";
  readonly regions = [
    "AT-01",
    "AT-02",
    "AT-03",
    "AT-04",
    "AT-05",
    "AT-06",
    "AT-07",
    "AT-08",
    "AT-09",
  ];

  async fetchStationData(station: listing.Feature, dataURLsIndex: number): Promise<StationData> {
    const dataURL = station.properties.dataURLs[dataURLsIndex];
    const response = await fetchOrThrow(dataURL);
    const collection = v.parse(FeatureCollectionSchema, await response.json());
    if (collection?.features?.length !== 1) throw new Error();

    const feature = collection?.features?.[0];
    const parameters = feature.properties.parameters;
    return new StationData(
      station?.properties?.name ?? feature.properties.station,
      station?.geometry?.coordinates?.[2] as number,
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

  async fetchStationListing(): Promise<listing.FeatureCollection> {
    if (!globalThis.Temporal) {
      await import("temporal-polyfill/global");
    }

    const metadata0 = await fetchOrThrow(`${URL}/metadata`);
    const metadata = v.parse(MetadataSchema, await metadata0.json());
    return {
      type: "FeatureCollection",
      features: metadata.stations.map((s) =>
        v.parse(listing.FeatureSchema, {
          type: "Feature",
          id: s.id,
          geometry: {
            type: "Point",
            coordinates: [s.lon, s.lat, s.altitude],
          },
          properties: {
            date: metadata.end_time,
            name: s.name
              .toLocaleLowerCase("de")
              // capitalize "ACHENKIRCH CAMPINGPLATZ"
              .replace(/(^|[-./()\s])\w/g, (c) => c.toLocaleUpperCase("de")),
            operator: "GeoSphere Austria",
            operatorLink: "https://www.geosphere.at/",
            operatorLicense: "CC BY 4.0",
            operatorLicenseLink: "https://creativecommons.org/licenses/by/4.0/legalcode",
            dataProviderID: this.dataProviderID,
            dataURLs: this.#dataURLs(s.id),
          },
        } satisfies listing.Feature),
      ),
    };
  }

  #dataURLs(id: string) {
    const end = Temporal.Now.instant().round("minute");
    const start = end.subtract({ hours: 7 * 24 });
    const base = {
      station_ids: id,
      parameters: "TL,FF,FFX,DD,P,RF,SCHNEE,TP",
      output_format: "geojson",
    };
    const params = new URLSearchParams({
      ...base,
      start: start.toString(),
      end: end.toString(),
    });
    const lazystart = end.subtract({ hours: 180 * 24 + 12 });
    const lazyparams = new URLSearchParams({
      ...base,
      start: lazystart.toString(),
      end: start.toString(),
    });
    return [`${URL}?${params}`, `${URL}?${lazyparams}`];
  }
}
