import type { Result } from "./station-data";

interface ParameterValues {
  name: string;
  unit: string;
  data: number[];
}

interface Feature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    parameters: {
      TL?: ParameterValues;
      FF?: ParameterValues;
      FFX?: ParameterValues;
      DD?: ParameterValues;
      P?: ParameterValues;
      RF?: ParameterValues;
      SCHNEE?: ParameterValues;
      TP?: ParameterValues;
    };
    station: string;
  };
}

interface FeatureCollection {
  media_type: string;
  type: string;
  version: string;
  timestamps: string[];
  features: Feature[];
}

export interface Metadata {
  title: string;
  parameters: Parameter[];
  frequency: string;
  type: string;
  mode: string;
  response_formats: string[];
  start_time: string;
  end_time: string;
  stations: Station[];
  id_type: string;
}

export interface Parameter {
  name: string;
  long_name: string;
  desc: string;
  unit: string;
}

export interface Station {
  type: string;
  id: string;
  group_id: null;
  name: string;
  state: string;
  lat: number;
  lon: number;
  altitude: number;
  valid_from: string;
  valid_to: string;
  has_sunshine: boolean;
  has_global_radiation: boolean;
  is_active: boolean;
}

export function parseGeosphereData(metadata: Metadata, collection: FeatureCollection): Result {
  if (collection?.features?.length !== 1) throw new Error();
  const feature = collection?.features?.[0];
  const station = metadata.stations.find((s) => s.id === feature.properties.station);
  const parameters = feature.properties.parameters;
  return {
    station: station.name ?? feature.properties.station,
    altitude: station?.altitude,
    timestamps: collection.timestamps.map((t) => Date.parse(t)),
    values: {
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
    units: {
      DW: parameters.DD?.unit,
      HS: parameters.SCHNEE?.unit,
      P: parameters.P?.unit,
      RH: parameters.RF?.unit,
      TA: parameters.TL?.unit,
      TD: parameters.TP?.unit,
      VW_MAX: parameters.FFX?.unit === "m/s" ? "km/h" : parameters.FFX?.unit,
      VW: parameters.FF?.unit === "m/s" ? "km/h" : parameters.FF?.unit,
    },
  };
}
