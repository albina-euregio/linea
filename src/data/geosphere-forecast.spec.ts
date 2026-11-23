import { expect, test } from "vite-plus/test";
import { windSpeedRangeKmH } from "./geosphere-forecast";

test("wind speed range of the u/v percentile box", () => {
  const range = windSpeedRangeKmH(
    // u: [3, 4] → box away from calm; [-1, 2] → box contains calm; [-4, -3] → negative u
    [3, -1, -4, null],
    [4, 2, -3, 1],
    [0, -2, 0, 1],
    [0, 1, 0, 1],
  );
  expect(range).toBeDefined();
  const { min, max } = range!;
  expect(min[0]).toBeCloseTo(3 * 3.6);
  expect(max[0]).toBeCloseTo(4 * 3.6);
  expect(min[1]).toBe(0);
  expect(max[1]).toBeCloseTo(Math.hypot(2, 2) * 3.6);
  expect(min[2]).toBeCloseTo(3 * 3.6);
  expect(max[2]).toBeCloseTo(4 * 3.6);
  expect(min[3]).toBeNull();
  expect(max[3]).toBeNull();
});

test("wind speed range requires all percentiles", () => {
  expect(windSpeedRangeKmH([1], [2], undefined, [1])).toBeUndefined();
});
