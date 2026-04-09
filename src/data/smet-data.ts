import { parseGeosphereData } from "./geosphere-data";
import { type ParameterType, type Units, type Values, StationData } from "./station-data";
import { unitTransformer } from "./units";

const DEFAULT_UNITS: Units = {
  P: "Pa",
  TA: "K",
  TD: "K",
  TSS: "K",
  // TSG: "K",
  RH: "1",
  VW_MAX: "m/s",
  VW: "m/s",
  DW: "degree",
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
  let response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch SMET data from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  if (url.startsWith("https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min")) {
    // https://dataset.api.hub.geosphere.at/
    const metadata = await fetch(
      "https://dataset.api.hub.geosphere.at/v1/station/historical/tawes-v1-10min/metadata",
    );
    return parseGeosphereData(await metadata.json(), await response.json());
  }

  let stream = response.body;
  if (
    response.headers.get("Content-Encoding") === "gzip" ||
    response.headers.get("Content-Type") === "application/x-gzip"
  ) {
    stream = stream.pipeThrough(new DecompressionStream("gzip"));
  }

  return parseSMET(stream);
}

export async function parseSMET(stream: ReadableStream<Uint8Array>): Promise<StationData> {
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
  const timestamps = [] as number[];
  let dataIndex = 0;

  function processLine(line: string) {
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
    } else if ((header = parseHeader("#units"))) {
      units = header.split(separator);
    } else if ((header = parseHeader("nodata"))) {
      nodata = header;
    } else if ((header = parseHeader("tz"))) {
      tz = +header;
    } else if ((header = parseHeader("station_name"))) {
      station = header;
    } else if ((header = parseHeader("altitude"))) {
      altitude = +header;
    } else if (/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.test(line)) {
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
      timestamps[dataIndex] = Date.parse(dateString);
      values.forEach((values0, i) => {
        if (i == 0) return; // timestamp
        if (cells[i] === nodata) {
          values0[dataIndex] = null;
          return;
        }
        const value = +cells[i].replace(",", ".");
        values0[dataIndex] = UNIT_MAPPING[units[i]]?.convert(value) ?? value;
      });
      dataIndex++;
    }
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer) {
        processLine(buffer);
      }
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      processLine(line);
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
