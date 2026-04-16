import { z } from "zod";
import * as listing from "../schema/listing";
import { StationData } from "./station-data";
import { fetchOrThrow } from "./fetchOrThrow";
import type { LineaDataProvider } from "./provider";
import { UnitSchema } from "./units";

export const URL = "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min";

export const GeometrySchema = z.object({
  type: z.enum(["Point"]),
  coordinates: z.number().array(),
});

export const ParameterTypeSchema = z.enum(["TL", "FF", "FFX", "DD", "P", "RF", "SCHNEE", "TP"]);

export const ParameterValuesSchema = z.object({
  name: z.string(),
  unit: z
    .string()
    .transform((s) => (s === "°C" ? "℃" : s))
    .transform((s) => UnitSchema.parse(s)),
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

export class GeoSphereDataProvider implements LineaDataProvider {
  readonly id = "GEOSPHERE";
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

  async fetchStationData(station: listing.Feature, dataURL: URL): Promise<StationData> {
    const response = await fetchOrThrow(dataURL);
    const collection = FeatureCollectionSchema.parse(await response.json());
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
    const metadata = MetadataSchema.parse(await metadata0.json());
    return {
      type: "FeatureCollection",
      features: metadata.stations.map((s) =>
        listing.FeatureSchema.parse({
          type: "Feature",
          id: s.id,
          geometry: {
            type: "Point",
            coordinates: [s.lon, s.lat, s.altitude],
          },
          properties: {
            name: s.name
              .toLocaleLowerCase("de")
              // capitalize "ACHENKIRCH CAMPINGPLATZ"
              .replace(/(^|[-./()\s])\w/g, (c) => c.toLocaleUpperCase("de")),
            operator: "GeoSphere Austria",
            operatorLink: "https://www.geosphere.at/",
            operatorLicense: "CC BY 4.0",
            operatorLicenseLink: "https://creativecommons.org/licenses/by/4.0/legalcode",
            dataProviderID: this.id,
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
