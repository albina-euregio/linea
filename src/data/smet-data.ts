import { fetchOrThrow } from "./fetchOrThrow";
import * as geosphere from "./geosphere-data";
import * as slf from "./slf-data";
import { type ParameterType, type Units, type Values, StationData } from "./station-data";
import { unitTransformer } from "./units";
import { profileAsync } from "../shared/profiler";
import { WASM_ENABLED, parseSMETBytes } from "./smet-wasm";

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

  if (WASM_ENABLED) {
    const bytes = await profileAsync(
      `fetch:download ${file}`,
      async () => new Uint8Array(await new Response(stream).arrayBuffer()),
    );
    return profileAsync(`parse:wasm ${file}`, () => parseSMETWasm(bytes));
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

const separator = /\s+/;

/**
 * SMET header, see https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf
 */
class SMETHeader {
  fields: string[] = [];
  units: string[] = [];
  nodata = "-777";
  station = "";
  altitude = NaN;
  /**
   * SMET: timezone of the measurements, decimal number positive going east. If not provided, utc is assumed.
   */
  tz = 0;

  /**
   * Parses a header line, returns false if the line is no known header.
   */
  parse(line: string): boolean {
    let value = "";
    if ((value = headerValue(line, "fields"))) {
      this.fields = value.split(separator);
      this.units = this.fields.map((f) => DEFAULT_UNITS[f as ParameterType] ?? "");
    } else if ((value = headerValue(line, "#units"))) {
      this.units = value.split(separator);
    } else if ((value = headerValue(line, "nodata"))) {
      this.nodata = value;
    } else if ((value = headerValue(line, "tz"))) {
      this.tz = +value;
    } else if ((value = headerValue(line, "station_name"))) {
      this.station = value;
    } else if ((value = headerValue(line, "altitude"))) {
      this.altitude = +value;
    } else {
      return false;
    }
    return true;
  }

  /** unit conversion per column */
  converters(): ((v: number) => number)[] {
    return this.units.map((u) => UNIT_MAPPING[u]?.convert ?? ((v) => v));
  }

  toStationData(timestamps: number[], values: (number | null)[][]): StationData {
    const units = this.units.map((u) => UNIT_MAPPING[u]?.to ?? u);
    return new StationData(
      this.station,
      this.altitude,
      timestamps,
      Object.fromEntries(this.fields.map((f, i) => [f, units[i]])) as Units,
      Object.fromEntries(this.fields.map((f, i) => [f, values[i]])) as Values,
    );
  }
}

function headerValue(line: string, prefix: string): string {
  if (!line.startsWith(prefix)) return "";
  line = line.slice(prefix.length).trim();
  if (!line.startsWith("=")) return "";
  return line.slice("=".length).trim();
}

async function parseSMET(lines: ReadableStream<string>): Promise<StationData> {
  const header = new SMETHeader();
  let values: (number | null)[][] | undefined;
  /** ISO 8601 offset of the header timezone, e.g. `tz = 1` -> `+01:00` */
  let tzOffset: string | undefined;
  /** unit conversion per column, resolved once on the first data line */
  let converters: ((v: number) => number)[] | undefined;
  const timestamps = [] as number[];
  let dataIndex = 0;

  const reader = lines.getReader();
  while (true) {
    const { value: line0, done } = await reader.read();
    if (done) break;

    if (header.parse(line0)) continue;
    if (!/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.test(line0)) continue;

    values ??= header.fields.map((): (number | null)[] => []);
    tzOffset ??= formatTimezoneOffset(header.tz);
    converters ??= header.converters();
    const cells = line0.split(separator);
    let dateString = cells[0];
    if (dateString.length === "2025-11-26T19:00:00".length) {
      dateString += tzOffset;
    }
    timestamps[dataIndex] = Date.parse(dateString);
    for (let i = 1; i < values.length; i++) {
      if (cells[i] === header.nodata) {
        values[i][dataIndex] = null;
        continue;
      }
      const value = +cells[i].replace(",", ".");
      values[i][dataIndex] = converters[i](value);
    }
    dataIndex++;
  }

  return header.toStationData(
    timestamps.slice(0, dataIndex),
    values ?? header.fields.map((): (number | null)[] => []),
  );
}

/**
 * Parses SMET with the WebAssembly implementation of the data lines, see `smet-wasm.ts`.
 */
async function parseSMETWasm(bytes: Uint8Array): Promise<StationData> {
  const { header, timestamps, columns } = await parseSMETBytes(bytes, (text) => {
    const header = new SMETHeader();
    for (const line of text.split(/\r?\n/)) {
      header.parse(line);
    }
    return header;
  });
  return header.toStationData(timestamps, columns);
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
