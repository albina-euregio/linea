declare module "zod" {
  interface GlobalMeta {
    unit: Unit;
  }
}

export type Unit =
  // temperature
  | "K"
  | "℃"
  // length
  | "m"
  | "cm"
  | "mm"
  // 1
  | "1"
  | "%"
  | "°"
  // speed
  | "m/s"
  | "km/h"
  // pressure
  | "hPa"
  | "Pa"
  // intensity (power per area)
  | "W/m²";

class Quantity<U extends Unit> {
  constructor(
    public value: number,
    public unit: U,
  ) {}

  convertTo(toUnit: U) {
    return transformUnit(this.value, this.unit, toUnit);
  }
}

export class Temperature extends Quantity<"K" | "℃"> {}
export class Length extends Quantity<"m" | "cm" | "mm"> {}
export class Scalar extends Quantity<"1" | "%" | "°"> {}
export class Speed extends Quantity<"m/s" | "km/h"> {}
export class Pressure extends Quantity<"hPa" | "Pa"> {}
export class Intensity extends Quantity<"W/m²"> {}

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
