import { fetchOrThrow } from "./fetchOrThrow";
import * as geosphere from "./geosphere-data";
import * as slf from "./slf-data";
import { type ParameterType, type Units, type Values, StationData } from "./station-data";
import { unitTransformer } from "./units";
import { profileAsync } from "../shared/profiler";

export const DEFAULT_UNITS: Units = {
  P: "Pa",
  TA: "K",
  TD: "K",
  TSS: "K",
  // TSG: "K",
  RH: "1",
  VW_MAX: "m/s",
  VW: "m/s",
  DW: "°",
  ISWR: "W/m²",
  // RSWR: "W/m²",
  // ILWR: "W/m²",
  // OLWR: "W/m²",
  // PINT: "mm/h",
  PSUM: "mm",
  HS: "m",
  NS: "m",
};

const UNIT_MAPPING: Record<string, { to: string; convert: (v: number) => number }> = {
  K: { to: "℃", convert: unitTransformer("K", "℃") },
  m: { to: "cm", convert: unitTransformer("m", "cm") },
  "1": { to: "%", convert: unitTransformer("1", "%") },
  "m/s": { to: "km/h", convert: unitTransformer("m/s", "km/h") },
  mm: { to: "mm", convert: unitTransformer("mm", "mm") },
};

export async function fetchSMET(url: string): Promise<StationData> {
  const file = url.split("/").slice(-2).join("/");
  let response = await profileAsync(`fetch:headers ${file}`, () => fetchOrThrow(url));

  if (url.startsWith(geosphere.URL)) {
    throw new Error();
  } else if (url.startsWith(slf.URL.STATION)) {
    throw new Error();
  } else if (url.startsWith("https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/")) {
    throw new Error();
  }

  let stream = response.body;
  if (
    response.headers.get("Content-Encoding") === "gzip" ||
    response.headers.get("Content-Type") === "application/gzip" ||
    response.headers.get("Content-Type") === "application/x-gzip"
  ) {
    stream = stream.pipeThrough(new DecompressionStream("gzip"));
  }

  const lines = stream.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream());

  return profileAsync(`fetch:download+parse ${file}`, () => parseSMET(lines));
}

class TextLineStream extends TransformStream<string, string> {
  constructor() {
    let buffer = "";
    super({
      transform(chunk, controller) {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop()!;
        for (const line of lines) {
          controller.enqueue(line);
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
        }
      },
    });
  }
}

async function parseSMET(lines: ReadableStream<string>): Promise<StationData> {
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
   * Stored as ISO 8601 offset, e.g. `tz = 1` -> `+01:00`.
   */
  let tzOffset = "Z";
  const timestamps = [] as number[];
  let dataIndex = 0;
  /** unit conversion per column, resolved once on the first data line */
  let converters: ((v: number) => number)[] | undefined;

  const reader = lines.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const line0 = value;

    function parseHeader(prefix: string) {
      let line = line0;
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
    } else if ((header = parseHeader("#units"))) {
      units = header.split(separator);
    } else if ((header = parseHeader("nodata"))) {
      nodata = header;
    } else if ((header = parseHeader("tz"))) {
      tzOffset = formatTimezoneOffset(+header);
    } else if ((header = parseHeader("station_name"))) {
      station = header;
    } else if ((header = parseHeader("altitude"))) {
      altitude = +header;
    } else if (/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.test(line0)) {
      const cells = line0.split(separator);
      let dateString = cells[0];
      if (dateString.length === "2025-11-26T19:00:00".length) {
        dateString += tzOffset;
      }
      timestamps[dataIndex] = Date.parse(dateString);
      converters ??= units.map((u) => UNIT_MAPPING[u]?.convert ?? ((v) => v));
      for (let i = 1; i < values.length; i++) {
        if (cells[i] === nodata) {
          values[i][dataIndex] = null;
          continue;
        }
        const value = +cells[i].replace(",", ".");
        values[i][dataIndex] = converters[i](value);
      }
      dataIndex++;
    }
  }

  units = units.map((u) => UNIT_MAPPING[u]?.to ?? u);
  return new StationData(
    station,
    altitude,
    timestamps.slice(0, dataIndex),
    Object.fromEntries(fields.map((f, i) => [f, units[i]])) as Units,
    Object.fromEntries(fields.map((f, i) => [f, values[i]])) as Values,
  );
}

/**
 * Formats a SMET timezone (decimal hours) as ISO 8601 offset, e.g. `1` -> `+01:00`, `-3.5` -> `-03:30`.
 */
function formatTimezoneOffset(tz: number): string {
  if (!tz) return "Z";
  const minutes = Math.round(Math.abs(tz) * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${tz < 0 ? "-" : "+"}${hh}:${mm}`;
}
