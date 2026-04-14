import { StationData } from "./station-data";
import { dewPoint } from "../linea-plot/dew-point";
import type { ParameterType, Units, Values } from "./station-data";

interface SLFStationData {
  station_code: string;
  measure_date: string;
  HS?: number | null;
  TA_30MIN_MEAN?: number | null;
  TA_30_MIN_MEAN?: number | null;
  RH_30MIN_MEAN?: number | null;
  TSS_30MIN_MEAN?: number | null;
  RSWR_30MIN_MEAN?: number | null;
  VW_30MIN_MEAN?: number | null;
  VW_30MIN_MAX?: number | null;
  DW_30MIN_MEAN?: number | null;
}

export interface SLFStationMetadata {
  code: string;
  label: string;
  elevation: number;
  lon?: number;
  lat?: number;
  country_code?: string;
  canton_code?: string;
  type?: string;
}

export const parseSLFAPIData = (
  stationsMetadata: SLFStationMetadata[],
  collection: SLFStationData[],
): StationData => {
  if (collection.length === 0) {
    throw new Error("No data");
  }
  const station = stationsMetadata.find((s) => s.code === collection[0].station_code);
  const timestamps = collection.map((entry) => Date.parse(entry.measure_date));

  const allSeries: Partial<Record<ParameterType, (number | null | undefined)[]>> = {
    DW: collection.map((entry) => entry.DW_30MIN_MEAN),
    HS: collection.map((entry) => entry.HS),
    RH: collection.map((entry) => entry.RH_30MIN_MEAN),
    TA: collection.map((entry) => entry.TA_30MIN_MEAN ?? entry.TA_30_MIN_MEAN),
    TD: collection.map((entry) =>
      dewPoint(entry.TA_30MIN_MEAN ?? entry.TA_30_MIN_MEAN ?? null, entry.RH_30MIN_MEAN ?? null),
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
};
