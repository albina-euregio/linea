import { dewPoint } from "../linea-plot/dew-point";
import * as listing from "../schema/listing";
import { StationData, type ParameterType, type Units, type Values } from "./station-data";
import type { LineaDataProvider } from "./provider";
import { fetchOrThrow } from "./fetchOrThrow";
import type { Unit } from "./units";

export const URL = "https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/stazioni.xml";
const BELLUNO_TIMEZONE = "Europe/Rome";

/**
 * Maps ARPAV parameter column names to SMET ParameterType.
 */
function mapParameterType(columnName: string): ParameterType | null {
  const normalized = normalizeHeader(columnName);

  if (normalized.includes("temperatura aria")) return "TA";
  if (normalized.includes("umidita relativa")) return "RH";
  if (normalized.includes("velocita vento")) return "VW";
  if (normalized.includes("direzione vento")) return "DW";
  if (normalized.includes("precipitazione")) return "PSUM";
  if (normalized.includes("altezza neve")) return "HS";
  if (normalized.includes("pressione atmosferica ridotta a livello del mare")) return "P";
  if (normalized.includes("radiazione solare globale")) return "ISWR";

  return null;
}

function normalizeHeader(value: string): string {
  return (
    value
      .replaceAll('"', "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Handle mojibake seen in CP1252/UTF8 conversion artifacts.
      .replaceAll("ã", "a")
      .replaceAll("â", "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}

function parseCsvRow(line: string): string[] {
  return line.split(";").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function parseNumeric(value: string): number | null {
  if (!value || value === ">>" || value.toLowerCase() === "nan") return null;
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function unitForParameter(parameter: ParameterType): Unit {
  switch (parameter) {
    case "TA":
      return "℃";
    case "RH":
      return "%";
    case "PSUM":
      return "mm";
    case "VW":
      return "m/s";
    case "DW":
      return "°";
    case "HS":
      return "cm";
    case "P":
      return "Pa";
    case "ISWR":
      return "W/m²";
    default:
      return "1";
  }
}

/**
 * Parses ARPAV CSV timestamp formats.
 */
function parseTimestamp(timestamp: string): number {
  // 16/04/2026 08:30 (ARPAV CSV)
  const itMatch = timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (itMatch) {
    const [, day, month, year, hour, minute] = itMatch;
    return Temporal.PlainDateTime.from({
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
      day: Number.parseInt(day, 10),
      hour: Number.parseInt(hour, 10),
      minute: Number.parseInt(minute, 10),
    })
      .toZonedDateTime(BELLUNO_TIMEZONE)
      .toInstant().epochMilliseconds;
  }
  throw new Error(`Unable to parse timestamp: ${timestamp}`);
}

function textContent(parent: Element, tagName: string): string {
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? "";
}

export class BellunoDataProvider implements LineaDataProvider {
  readonly dataProviderID = "IT-34";
  readonly regions = ["IT-34"];

  async fetchStationListing(): Promise<listing.FeatureCollection> {
    const response = await fetchOrThrow(URL);
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Failed to parse ARPAV Belluno XML");
    }
    const stations = Array.from(doc.getElementsByTagName("STAZIONE"));
    const features = stations.map((element) => {
      const rawId = textContent(element, "IDSTAZ");
      const name = textContent(element, "NOME");
      const longitude = Number.parseFloat(textContent(element, "X"));
      const latitude = Number.parseFloat(textContent(element, "Y"));
      const altitude = Number.parseFloat(textContent(element, "QUOTA"));

      if (!rawId || !name || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        throw new Error("Invalid Belluno station entry");
      }
      const id = rawId.trim().padStart(4, "0");
      return listing.FeatureSchema.parse({
        type: "Feature",
        id,
        geometry: {
          type: "Point",
          coordinates: [longitude, latitude, Number.isFinite(altitude) ? altitude : null],
        },
        properties: {
          name: name,
          dataProviderID: this.dataProviderID,
          dataURLs: [`https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/${id}.csv`],
          operator: "ARPAV",
          operatorLink: "https://www.arpa.veneto.it/",
          operatorLicense: "CC BY 4.0",
          operatorLicenseLink: "https://creativecommons.org/licenses/by/4.0/deed.it",
        },
      } satisfies listing.Feature);
    });
    return { type: "FeatureCollection", features };
  }

  /**
   * Parses CSV data from ARPAV Belluno meteorological service.
   */
  async fetchStationData(f: listing.Feature, dataURLsIndex: number): Promise<StationData> {
    const dataURL = f.properties.dataURLs[dataURLsIndex];
    const response = await fetchOrThrow(dataURL);
    const csv = await response.text();
    const lines = csv
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = parseCsvRow(lines[0]);
    const normalizedHeaders = headers.map(normalizeHeader);

    const timestampColumnIndex = normalizedHeaders.findIndex((h) => h === "dataora");
    const stationNameColumn = normalizedHeaders.findIndex((h) => h === "nome");

    if (timestampColumnIndex === -1) {
      throw new Error("Could not find timestamp column DATAORA");
    }

    const columnMap = new Map<number, ParameterType>();
    for (let i = 0; i < headers.length; i++) {
      const parameter = mapParameterType(headers[i]);
      if (parameter) columnMap.set(i, parameter);
    }

    const seriesByParameter = new Map<ParameterType, (number | null)[]>();
    for (const parameter of columnMap.values()) {
      if (!seriesByParameter.has(parameter)) seriesByParameter.set(parameter, []);
    }

    const timestamps: number[] = [];
    let stationName = "Unknown";

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
      const cells = parseCsvRow(lines[lineIndex]);
      const timestampCell = cells[timestampColumnIndex];
      if (!timestampCell) continue;

      try {
        timestamps.push(parseTimestamp(timestampCell));
        if (stationNameColumn >= 0 && cells[stationNameColumn]) {
          stationName = cells[stationNameColumn];
        }

        for (const [columnIndex, parameter] of columnMap.entries()) {
          const value = parseNumeric(cells[columnIndex] ?? "");
          seriesByParameter.get(parameter)?.push(value);
        }
      } catch {
        continue;
      }
    }

    if (timestamps.length === 0) {
      throw new Error("No valid rows found in Belluno CSV");
    }

    const values: Values = {};
    const units: Units = {};

    for (const [parameter, series] of seriesByParameter.entries()) {
      if (!series.some((v) => v != null)) continue;
      values[parameter] = series;
      units[parameter] = unitForParameter(parameter);
    }

    if (values.TA && values.RH && !values.TD) {
      values.TD = values.TA.map((t, i) => {
        const rh = values.RH?.[i];
        return t == null || rh == null ? null : dewPoint(t, rh);
      });
    }

    const isDescending = timestamps.length > 1 && timestamps[0] > timestamps[timestamps.length - 1];
    if (isDescending) {
      timestamps.reverse();
      for (const key of Object.keys(values) as ParameterType[]) {
        values[key] = [...(values[key] ?? [])].reverse();
      }
    }
    return new StationData(stationName, null, timestamps, units, values);
  }
}
