import "temporal-polyfill/global";
import { beforeAll, expect, test } from "vite-plus/test";
import { tryLoadSmetWasm } from "./smet-wasm";
import { StationData, StationDataArray } from "./station-data";

beforeAll(async () => {
  await tryLoadSmetWasm();
});

test("generalize aligns all stations to a common timeline", () => {
  const results = new StationDataArray(
    new StationData("A", 1000, [3, 4, 5], {}, { TA: [1, null, 3], HS: [10, 20, 30] }),
    new StationData("B", 2000, [4, 6], {}, { TA: [40, 60] }),
  );

  results.generalize();

  expect(results[0].timestamps).toEqual([3, 4, 5, 6]);
  expect(results[0].values).toEqual({
    TA: Float64Array.of(1, NaN, 3, NaN),
    HS: Float64Array.of(10, 20, 30, NaN),
  });
  expect(results[1].timestamps).toEqual([3, 4, 5, 6]);
  expect(results[1].values).toEqual({ TA: Float64Array.of(NaN, 40, NaN, 60) });
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
  expect(results[0].values).toEqual({
    TA: Float64Array.of(-1, NaN, 1, 2),
    HS: Float64Array.of(8, 9, 10, NaN),
  });
});

test("mergeWith aligns all stations and fills gaps from previous alignment", () => {
  const results = new StationDataArray(
    new StationData("A", 1000, [3, 4], {}, { TA: [1, 2] }),
    new StationData("B", 2000, [4], {}, { TA: [40] }),
  );
  results.generalize();
  expect(results[1].values).toEqual({ TA: Float64Array.of(NaN, 40) });

  results.mergeWith(
    new StationDataArray(
      new StationData("A", 1000, [2], {}, { TA: [0] }),
      new StationData("B", 2000, [3, 5], {}, { TA: [30, 50] }),
    ),
  );

  expect(results[0].timestamps).toEqual([2, 3, 4, 5]);
  expect(results[0].values).toEqual({ TA: Float64Array.of(0, 1, 2, NaN) });
  expect(results[1].timestamps).toEqual([2, 3, 4, 5]);
  expect(results[1].values).toEqual({ TA: Float64Array.of(NaN, 30, 40, 50) });
});

test("filter keeps measurements and forecast within the timespan", () => {
  const data = new StationData(
    "A",
    1000,
    [1, 2, 3, 4, 5],
    {},
    { TA: [10, 20, null, 40, 50] },
    {
      timestamps: [4, 5, 6],
      values: { TA: [-4, -5, -6] },
    },
  );
  const at = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO("UTC");

  const filtered = data.filter(at(2), at(5));

  expect(filtered.timestamps).toEqual([2, 3, 4, 5]);
  expect(filtered.values).toEqual({ TA: Float64Array.of(20, NaN, 40, 50) });
  expect(filtered.forecast).toEqual({
    timestamps: [4, 5],
    values: { TA: Float64Array.of(-4, -5) },
  });
  expect(data.filter(at(6), at(9)).timestamps).toEqual([]);
});
