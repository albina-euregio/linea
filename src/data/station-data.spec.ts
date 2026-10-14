import { beforeAll, expect, test } from "vite-plus/test";
import { WASM_ENABLED, loadSmetWasm } from "./smet-wasm";
import { StationData, StationDataArray } from "./station-data";

beforeAll(async () => {
  if (WASM_ENABLED) await loadSmetWasm();
});

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

test("mergeWith merges new timestamps, keeping existing values", () => {
  const results = new StationDataArray(
    new StationData("A", 1000, [3, 4], {}, { TA: [1, 2], HS: [10, null] }),
  );

  results.mergeWith(
    new StationDataArray(
      new StationData("A", 1000, [1, 2, 3], {}, { TA: [-1, null, 99], HS: [8, 9, 99] }),
    ),
  );

  expect(results[0].timestamps).toEqual([1, 2, 3, 4]);
  expect(results[0].values).toEqual({ TA: [-1, null, 1, 2], HS: [8, 9, 10, null] });
});

test("mergeWith aligns all stations and fills gaps from previous alignment", () => {
  const results = new StationDataArray(
    new StationData("A", 1000, [3, 4], {}, { TA: [1, 2] }),
    new StationData("B", 2000, [4], {}, { TA: [40] }),
  );
  results.generalize();
  expect(results[1].values).toEqual({ TA: [NaN, 40] });

  results.mergeWith(
    new StationDataArray(
      new StationData("A", 1000, [2], {}, { TA: [0] }),
      new StationData("B", 2000, [3, 5], {}, { TA: [30, 50] }),
    ),
  );

  expect(results[0].timestamps).toEqual([2, 3, 4, 5]);
  expect(results[0].values).toEqual({ TA: [0, 1, 2, NaN] });
  expect(results[1].timestamps).toEqual([2, 3, 4, 5]);
  expect(results[1].values).toEqual({ TA: [NaN, 30, 40, 50] });
});
