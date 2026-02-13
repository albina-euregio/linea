/**
 * Formula for TD (Magnus)
 */
export function dewPoint(tempC: number, RH: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(RH / 100);
  return (b * alpha) / (a - alpha);
}
