import { expect, test } from "vite-plus/test";
import { StationData, StationDataArray } from "./station-data";

test("generalize aligns all stations to a common timeline", () => {
  const results = new StationDataArray(
    new StationData("A", 1000, [3, 4, 5], {}, { TA: [1, null, 3], HS: [10, 20, 30] }),
    new StationData("B", 2000, [4, 6], {}, { TA: [40, 60] }),
  );

  results.generalize();

  expect(results[0].timestamps).toEqual([3, 4, 5, 6]);
  expect(results[0].values).toEqual({ TA: [1, null, 3, NaN], HS: [10, 20, 30, NaN] });
  expect(results[1].timestamps).toEqual([3, 4, 5, 6]);
  expect(results[1].values).toEqual({ TA: [NaN, 40, NaN, 60] });
});
