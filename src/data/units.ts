import z from "zod";
import * as smet from "./smet-data";

declare module "zod" {
  interface GlobalMeta {
    unit: Unit;
  }
}

export const UnitSchema = z.enum([
  // temperature
  "K",
  "℃",
  // length
  "m",
  "cm",
  "mm",
  // 1
  "1",
  "%",
  "°",
  // speed
  "m/s",
  "km/h",
  // pressure
  "hPa",
  "Pa",
  // intensity (power per area)
  "W/m²",
]);

export type Unit = z.infer<typeof UnitSchema>;

class Quantity<U extends Unit> {
  constructor(
    public value: number,
    public unit: U,
  ) {}

  convertTo(toUnit: U) {
    return transformUnit(this.value, this.unit, toUnit);
  }
}

export class Temperature extends Quantity<"K" | "℃"> {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.TA);
  }
}
export class Length extends Quantity<"m" | "cm" | "mm"> {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.HS);
  }
}
export class Precipitation extends Length {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.PSUM);
  }
}
export class Scalar extends Quantity<"1" | "%" | "°"> {
  toJSON() {
    return transformUnit(
      this.value,
      this.unit,
      this.unit === "°" ? smet.DEFAULT_UNITS.DW : smet.DEFAULT_UNITS.RH,
    );
  }
}
export class Speed extends Quantity<"m/s" | "km/h"> {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.VW);
  }
}
export class Pressure extends Quantity<"hPa" | "Pa"> {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.P);
  }
}
export class Intensity extends Quantity<"W/m²"> {
  toJSON() {
    return transformUnit(this.value, this.unit, smet.DEFAULT_UNITS.ISWR);
  }
}

export function unitTransformer(
  fromUnit: Unit,
  toUnit: Unit,
): (v: number | undefined | null) => number | undefined | null {
  if (fromUnit === toUnit) {
    return (v) => v;
  }
  if ((fromUnit as unknown) === "°C") fromUnit = "℃";
  if ((toUnit as unknown) === "°C") toUnit = "℃";
  switch (`from ${fromUnit} to ${toUnit}` as const) {
    // temperature
    case "from K to ℃":
      return (v) => v - 273.15;
    case "from ℃ to K":
      return (v) => v + 273.15;
    // length
    case "from m to cm":
      return (v) => v * 100;
    case "from cm to m":
      // 1
      return (v) => v / 100;
    case "from 1 to %":
      return (v) => v * 100;
    case "from % to 1":
      return (v) => v / 100;
    // speed
    case "from m/s to km/h":
      return (v) => v * 3.6;
    case "from km/h to m/s":
      return (v) => v / 3.6;
    // pressure
    case "from hPa to Pa":
      return (v) => v * 100;
    case "from Pa to hPa":
      return (v) => v / 100;
  }
  throw new Error(`Unsupported transformation from ${fromUnit} to ${toUnit}`);
}

export function transformUnit(
  value: number | undefined | null,
  fromUnit: Unit,
  toUnit: Unit,
): number | undefined | null {
  return isFinite(value) ? unitTransformer(fromUnit, toUnit)(value) : value;
}
