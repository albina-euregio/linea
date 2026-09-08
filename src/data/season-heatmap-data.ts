if (!globalThis.Temporal) {
  import("temporal-polyfill/global");
}

/**
 * The reference season all measurements are folded onto: the x axis of the
 * heatmap runs from October 1st to July 1st. 2000/01 is used because 2001 is
 * not a leap year — February 29th is excluded so that every season contributes
 * the same 274 columns.
 */
const SEASON_START = Temporal.PlainDate.from("2000-10-01");
const SEASON_END = Temporal.PlainDate.from("2001-07-01");

const DAY_COUNT = SEASON_START.until(SEASON_END, { largestUnit: "day" }).days + 1;

/** Reduces the measurements of one calendar day to their maximum. */
export const dailyMax = (values: number[]): number => Math.max(...values);

/** Reduces the measurements of one calendar day to their mean. */
export const dailyMean = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * One value per (calendar day, season) cell, laid out for a uPlot `mode: 2`
 * heatmap series: the cells are ordered x-major, i.e. all seasons of one
 * calendar day are adjacent, which is what {@link heatmapPaths} expects.
 */
export class SeasonHeatmapData {
  /** the reference-season timestamp of the cell's calendar day */
  xs: number[] = [];
  /** the year the cell's season started in, e.g. 2023 for the 2023/24 season */
  ys: number[] = [];
  /** the cell value, `null` where no measurement exists */
  values: (number | null)[] = [];
  /** the season start years, ascending — one heatmap row each */
  seasons: number[] = [];
  /** the reference-season timestamps, ascending — one heatmap column each */
  days: number[] = [];

  get isEmpty(): boolean {
    return this.values.length === 0;
  }

  /**
   * Folds a measurement series onto the October–July reference season. Days
   * outside the season (July 2nd to September 30th) and February 29th are
   * dropped, several measurements of the same calendar day are reduced by
   * {@link reduce}.
   *
   * @param timeZone the time zone the timestamps are assigned to calendar days in
   * @param timestamps the measurement timestamps in milliseconds
   * @param values the measured values, one per timestamp
   * @param reduce reduces the measurements of one calendar day to its cell value
   */
  static from(
    timeZone: string,
    timestamps: number[],
    values: (number | null)[],
    reduce: (values: number[]) => number = dailyMax,
  ): SeasonHeatmapData {
    const heatmap = new SeasonHeatmapData();
    // season start year -> one value per day of the reference season
    const bySeason = new Map<number, (number[] | undefined)[]>();

    for (let i = 0; i < timestamps.length; i++) {
      const value = values[i];
      if (!Number.isFinite(value)) continue;
      const date = Temporal.Instant.fromEpochMilliseconds(timestamps[i])
        .toZonedDateTimeISO(timeZone)
        .toPlainDate();
      // the reference season is not a leap one, so leap days have no column
      if (date.month === 2 && date.day === 29) continue;
      const referenceDate = date.with({
        year: date.month >= SEASON_START.month ? SEASON_START.year : SEASON_END.year,
      });
      if (
        Temporal.PlainDate.compare(referenceDate, SEASON_START) < 0 ||
        Temporal.PlainDate.compare(SEASON_END, referenceDate) < 0
      ) {
        continue;
      }
      const season = date.month >= SEASON_START.month ? date.year : date.year - 1;
      const day = SEASON_START.until(referenceDate, { largestUnit: "day" }).days;

      let days = bySeason.get(season);
      if (!days) {
        days = Array.from({ length: DAY_COUNT });
        bySeason.set(season, days);
      }
      (days[day] ??= []).push(value);
    }

    if (bySeason.size === 0) return heatmap;

    const seasons = [...bySeason.keys()].sort((a, b) => a - b);
    // fill up seasons without any measurement so that the rows stay evenly spaced
    for (let season = seasons[0]; season <= seasons.at(-1); season++) {
      heatmap.seasons.push(season);
    }
    for (let day = 0; day < DAY_COUNT; day++) {
      heatmap.days.push(
        SEASON_START.add({ days: day }).toZonedDateTime({ plainTime: "00:00:00", timeZone })
          .epochMilliseconds,
      );
    }

    for (const day of heatmap.days.keys()) {
      for (const season of heatmap.seasons) {
        heatmap.xs.push(heatmap.days[day]);
        heatmap.ys.push(season);
        const cell = bySeason.get(season)?.[day];
        heatmap.values.push(cell?.length ? reduce(cell) : null);
      }
    }
    return heatmap;
  }
}
