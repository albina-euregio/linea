import { describe, expect, test } from "vite-plus/test";
import { dailyMean, SeasonHeatmapData } from "./season-heatmap-data";
import "temporal-polyfill/global";

const timeZone = "Europe/Vienna";

function timestamp(date: string): number {
  return Temporal.PlainDate.from(date).toZonedDateTime({ plainTime: "00:00:00", timeZone })
    .epochMilliseconds;
}

function cellOf(heatmap: SeasonHeatmapData, day: string, season: number): number | null {
  const x = timestamp(day);
  const index = heatmap.xs.findIndex((v, i) => v === x && heatmap.ys[i] === season);
  expect(index).toBeGreaterThanOrEqual(0);
  return heatmap.values[index];
}

describe("SeasonHeatmapData", () => {
  test("folds the seasons onto the reference season", () => {
    const heatmap = SeasonHeatmapData.from(
      timeZone,
      ["2022-12-24", "2023-03-15", "2023-12-24", "2024-07-01"].map(timestamp),
      [10, 20, 30, 50],
    );
    expect(heatmap.seasons).toEqual([2022, 2023]);
    expect(heatmap.days.length).toBe(274);
    expect(heatmap.days[0]).toBe(timestamp("2000-10-01"));
    expect(heatmap.days.at(-1)).toBe(timestamp("2001-07-01"));
    expect(heatmap.xs.length).toBe(274 * 2);

    expect(cellOf(heatmap, "2000-12-24", 2022)).toBe(10);
    expect(cellOf(heatmap, "2001-03-15", 2022)).toBe(20);
    expect(cellOf(heatmap, "2000-12-24", 2023)).toBe(30);
    expect(cellOf(heatmap, "2001-07-01", 2023)).toBe(50);
    expect(cellOf(heatmap, "2000-10-01", 2022)).toBe(null);
  });

  test("excludes February 29th", () => {
    const heatmap = SeasonHeatmapData.from(
      timeZone,
      ["2024-02-28", "2024-02-29", "2024-03-01"].map(timestamp),
      [10, 20, 30],
    );
    expect(cellOf(heatmap, "2001-02-28", 2023)).toBe(10);
    expect(cellOf(heatmap, "2001-03-01", 2023)).toBe(30);
    expect(heatmap.values.filter((v) => v === 20)).toEqual([]);
  });

  test("skips summer, keeps gap seasons and reduces a day to its maximum", () => {
    const heatmap = SeasonHeatmapData.from(
      timeZone,
      ["2020-11-05", "2020-11-05", "2021-08-15", "2023-11-05"].map(timestamp),
      [5, 7, 100, 9],
    );
    expect(heatmap.seasons).toEqual([2020, 2021, 2022, 2023]);
    expect(cellOf(heatmap, "2000-11-05", 2020)).toBe(7);
    expect(cellOf(heatmap, "2000-11-05", 2021)).toBe(null);
    expect(cellOf(heatmap, "2000-11-05", 2023)).toBe(9);
    expect(heatmap.values.filter((v) => v === 100)).toEqual([]);
  });

  test("reduces a day with the given reducer", () => {
    const timestamps = ["2020-11-05", "2020-11-05", "2020-11-05"].map(timestamp);
    const max = SeasonHeatmapData.from(timeZone, timestamps, [2, 4, 9]);
    const mean = SeasonHeatmapData.from(timeZone, timestamps, [2, 4, 9], dailyMean);
    expect(cellOf(max, "2000-11-05", 2020)).toBe(9);
    expect(cellOf(mean, "2000-11-05", 2020)).toBe(5);
  });

  test("is empty without measurements", () => {
    expect(SeasonHeatmapData.from(timeZone, [], []).isEmpty).toBe(true);
    expect(SeasonHeatmapData.from(timeZone, [timestamp("2023-08-15")], [1]).isEmpty).toBe(true);
  });
});
