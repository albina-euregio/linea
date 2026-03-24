/**
 * Parameter type following the [SMET specification](https://code.wsl.ch/snow-models/meteoio/-/blob/master/doc/SMET_specifications.pdf)
 */
export enum ParameterType {
  /** P Air pressure, in Pa */
  "P" = "P",
  /** TA Temperature Air, in Kelvin */
  "TA" = "TA",
  /** TD Temperature Dew Point, in Kelvin */
  "TD" = "TD",
  /** TSS Temperature Snow Surface, in Kelvin */
  "TSS" = "TSS",
  /** TSG Temperature Surface Ground, in Kelvin */
  "TSG" = "TSG",
  /** RH Relative Humidity, between 0 and 1 */
  "RH" = "RH",
  /** VW_MAX Maximum wind velocity, in m/s */
  "VW_MAX" = "VW_MAX",
  /** VW Velocity Wind, in m/s */
  "VW" = "VW",
  /** DW Direction Wind, in degrees, clockwise and north being zero degrees */
  "DW" = "DW",
  /** ISWR Incoming Short Wave Radiation, in W/m2 */
  "ISWR" = "ISWR",
  /** RSWR Reflected Short Wave Radiation, in W/m2 (previously OSWR) */
  "RSWR" = "RSWR",
  /** ILWR Incoming Long Wave Radiation, in W/m2 */
  "ILWR" = "ILWR",
  /** OLWR Outgoing Long Wave Radiation, in W/m2 */
  "OLWR" = "OLWR",
  /** PINT Precipitation Intensity, in mm/h, as an average over the timestep */
  "PINT" = "PINT",
  /** PSUM Precipitation accumulation, in mm, summed over the last timestep */
  "PSUM" = "PSUM",
  /** HS Height Snow, in m */
  "HS" = "HS",
  "NS" = "NS",
}

export type Units = Record<ParameterType, string>;

export type Values = Record<ParameterType, (number | null)[]>;

export type StationData = {
  station: string;
  altitude: number;
  timestamps: number[];
  units: Units;
  values: Values;
};
