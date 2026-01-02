import { parseGeosphereData } from "./geosphere-data";
import type { ParameterType, Result, Units, Values } from "./station-data";

const DEFAULT_UNITS: Units = {
  P: "Pa",
  TA: "K",
  TD: "K",
  TSS: "K",
  TSG: "K",
  RH: "1",
  VW_MAX: "m/s",
  VW: "m/s",
  DW: "degree",
  ISWR: "W/m²",
  RSWR: "W/m²",
  ILWR: "W/m²",
  OLWR: "W/m²",
  PINT: "mm/h",
  PSUM: "mm",
  HS: "m",
  NS: "m",
};

const UNIT_MAPPING: Record<string, { to: string; convert: (v: number) => number }> = {
  K: { to: "°C", convert: (v) => v - 273.15 },
  m: { to: "cm", convert: (v) => v * 100 },
  "1": { to: "%", convert: (v) => v * 100 },
  "m/s": { to: "km/h", convert: (v) => v * 3.6 },
  mm: { to: "mm", convert: (v) => v },
};

export async function fetchSMET(url: string): Promise<Result> {
  let response = await fetch(url);
  if (url.startsWith("https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min")) {
    // https://dataset.api.hub.geosphere.at/
    const metadata = await fetch(
      "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min/metadata",
    );
    return parseGeosphereData(await metadata.json(), await response.json());
  }

  if (
    response.headers.get("Content-Encoding") === "gzip" ||
    response.headers.get("Content-Type") === "application/x-gzip"
  ) {
    const blob = await response.blob();
    const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
    response = new Response(stream);
  }

  const smet = await response.text();
  return parseSMET(smet);
}

export function parseSMET(smet: string): Result {
  // https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf
  const separator = /\s+/;
  let values: number[][] = [];
  let fields: string[] = [];
  let units: string[] = [];
  let nodata = "-777";
  let station = "";
  let altitude = NaN;
  /**
   * SMET: timezone of the measurements, decimal number positive going east. If not provided, utc is assumed.
   */
  let tz = 0;
  const lines = smet.split(/\r?\n/);
  const timestamps = [] as number[];
  let dataIndex = 0;
  lines.forEach((line) => {
    function parseHeader(prefix: string) {
      if (!line.startsWith(prefix)) return "";
      line = line.slice(prefix.length).trim();
      if (!line.startsWith("=")) return "";
      line = line.slice("=".length).trim();
      return line;
    }

    let header = "";
    if ((header = parseHeader("fields"))) {
      fields = header.split(separator);
      units = fields.map((f) => DEFAULT_UNITS[f as ParameterType] ?? "");
      values = fields.map(() => [] as number[]);
      return;
    } else if ((header = parseHeader("#units"))) {
      units = header.split(separator);
      return;
    } else if ((header = parseHeader("nodata"))) {
      nodata = header;
      return;
    } else if ((header = parseHeader("tz"))) {
      tz = +header;
      return;
    } else if ((header = parseHeader("station_name"))) {
      station = header;
      return;
    } else if ((header = parseHeader("altitude"))) {
      altitude = +header;
      return;
    } else if (!/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.test(line)) {
      return;
    }
    const cells = line.split(separator);
    let dateString = cells[0];
    if (dateString.length === "2025-11-26T19:00:00".length) {
      if (tz === 0) {
        dateString += "Z";
      } else if (tz > 0) {
        dateString += `+${String(tz).padStart(2, "0")}:00`; // `tz = 1` -> `+01:00`
      } else {
        dateString += `-${String(tz).padStart(2, "0")}:00`;
      }
    }
    const date = Date.parse(dateString);
    timestamps[dataIndex] = date;
    values.forEach((values0, i) => {
      if (i == 0) return; // timestamp
      const value = cells[i] === nodata ? null : +cells[i].replace(",", ".");
      values0[dataIndex] = value == null ? null : (UNIT_MAPPING[units[i]]?.convert(value) ?? value);
    });
    dataIndex++;
  });

  units = units.map((u) => UNIT_MAPPING[u]?.to ?? u);
  return {
    station,
    altitude,
    timestamps: timestamps.slice(0, dataIndex),
    units: Object.fromEntries(fields.map((f, i) => [f, units[i]])) as Units,
    values: Object.fromEntries(fields.map((f, i) => [f, values[i]])) as Values,
  };
}
