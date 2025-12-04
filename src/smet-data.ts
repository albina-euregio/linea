// P Air pressure, in Pa
// TA Temperature Air, in Kelvin
// TD Temperature Dew Point, in Kelvin
// TSS Temperature Snow Surface, in Kelvin
// TSG Temperature Surface Ground, in Kelvin
// RH Relative Humidity, between 0 and 1
// VW_MAX Maximum wind velocity, in m/s
// VW Velocity Wind, in m/s
// DW Direction Wind, in degrees, clockwise and north being zero degrees
// ISWR Incoming Short Wave Radiation, in W/m2
// RSWR Reflected Short Wave Radiation, in W/m2 (previously OSWR)
// ILWR Incoming Long Wave Radiation, in W/m2
// OLWR Outgoing Long Wave Radiation, in W/m2
// PINT Precipitation Intensity, in mm/h, as an average over the timestep
// PSUM Precipitation accumulation, in mm, summed over the last timestep
// HS Height Snow, in m
type ParameterType =
  | "P"
  | "TA"
  | "TD"
  | "TSS"
  | "TSG"
  | "RH"
  | "VW_MAX"
  | "VW"
  | "DW"
  | "ISWR"
  | "RSWR"
  | "ILWR"
  | "OLWR"
  | "PINT"
  | "PSUM"
  | "HS"
  | "NS";

const UNIT_MAPPING: Record<
  string,
  { to: string; convert: (v: number) => number }
> = {
  "K": { to: "°C", convert: (v) => v - 273.15 },
  "m": { to: "cm", convert: (v) => v * 100 },
  "1": { to: "%", convert: (v) => v * 100 },
  "m/s": { to: "km/h", convert: (v) => v * 3.6 },
  "mm": { to: "mm", convert: (v) => v },
};

type Units = Record<ParameterType, string>;
export type Values = Record<ParameterType, number[]>;
export type Result = {
  station: string;
  altitude: number;
  timestamps: Uint32Array;
  units: Units;
  values: Values;
};

export async function fetchSMET(
  url: string
): Promise<Result> {
  const response = await fetch(url);
  const smet = await response.text();
  return parseSMET(smet);
}

export function parseSMET(smet: string): Result {
  // https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf
  let values: number[][] = [];
  let fields: string[] = [];
  let units: string[] = [];
  let nodata = "-777";
  let station = "";
  let altitude = NaN;
  const now = Date.now();
  const lines = smet.split(/\r?\n/);
  const timestamps = new Uint32Array(lines.length);
  let dataIndex = 0;
  lines.forEach((line) => {
    if (line.startsWith("fields =")) {
      fields = line.slice("fields =".length).trim().split(" ");
      values = fields.map(() => [] as number[]);
      return;
    } else if (line.startsWith("#units =")) {
      units = line.slice("#units =".length).trim().split(" ");
      return;
    } else if (line.startsWith("nodata =")) {
      nodata = line.slice("nodata =".length).trim();
      return;
    } else if (line.startsWith("station_name =")) {
      station = line.slice("station_name =".length).trim();
      return;
    } else if (line.startsWith("altitude =")) {
      altitude = +line.slice("altitude =".length).trim();
      return;
    } else if (!/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.test(line)) {
      return;
    }
    const cells = line.split(" ");
    const date = Date.parse(cells[0]);
    // uPlot uses epoch seconds (instead of milliseconds)
    timestamps[dataIndex] = date / 1000;
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
