import { describe, expect, test } from "vite-plus/test";
import { YearData } from "./year-data";
import "temporal-polyfill/global";

describe("YearData", () => {
  test("fills a season without any measurement", () => {
    const yearData = YearData.from(
      "Europe/Vienna",
      Temporal.PlainDate.from("2026-10-01"),
      Temporal.PlainDate.from("2026-10-03"),
      [
        Temporal.ZonedDateTime.from("2025-10-01T00:00[Europe/Vienna]").epochMilliseconds,
        Temporal.ZonedDateTime.from("2025-10-02T00:00[Europe/Vienna]").epochMilliseconds,
      ],
      [10, 20],
    );
    expect(yearData.timestamps).toEqual([
      Temporal.ZonedDateTime.from("2026-10-01T00:00[Europe/Vienna]").epochMilliseconds,
      Temporal.ZonedDateTime.from("2026-10-02T00:00[Europe/Vienna]").epochMilliseconds,
      Temporal.ZonedDateTime.from("2026-10-03T00:00[Europe/Vienna]").epochMilliseconds,
    ]);
    expect(yearData.values).toEqual([NaN, NaN, NaN]);
    expect(yearData.maxValues).toEqual([10, 20, null]);
  });
});
