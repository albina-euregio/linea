import type { Result, Values } from "../data/station-data";
import { fetchSMET } from "../data/smet-data";
import type { AbstractLineaChart } from "./abstract-linea-chart";
import type AirDatepicker from "air-datepicker";
import type { LineaPlot } from "../linea-plot";
import { i18n } from "../i18n";

/**
 * Abstract base class for view implementations (Station view and Winter view)
 * Handles common view functionality such as data filtering and chart management
 */
export abstract class LineaView {
  charts: AbstractLineaChart[] = [];
  protected backgroundColors: string[];
  protected dp: AirDatepicker | undefined;
  protected showTitle: boolean = false;
  minTime: number = +Infinity;
  maxTime: number = -Infinity;
  results: Result[] = [];
  srcs: string[] = [];
  protected lineaplot: LineaPlot;

  constructor(backgroundColors: string[], lineaplot: LineaPlot) {
    this.backgroundColors = backgroundColors;
    this.lineaplot = lineaplot;
    this.dp = lineaplot.dp;
    this.showTitle = lineaplot.hasAttribute("showtitle");
  }

  /**
   * Initialize the view with data
   */
  abstract initialize(): Promise<void>;

  abstract show(): void;

  /**
   * Get all charts in this view
   */
  getCharts(): AbstractLineaChart[] {
    return this.charts;
  }

  /**
   * Fetch data from sources
   */
  async fetchData(attribute: string): Promise<Result[]> {
    const src = this.lineaplot.getAttribute(attribute) ?? "";
    this.srcs = src.startsWith("[") || src.startsWith("'") ? (JSON.parse(src) as string[]) : [src];

    if (this.srcs.length == 0) {
      throw "Empty src array!";
    }

    const results: Result[] = [];
    for (const src of this.srcs) {
      const result = await fetchSMET(src);
      this.minTime = Math.min(this.minTime, result.timestamps[0]);
      this.maxTime = Math.max(this.maxTime, result.timestamps[result.timestamps.length - 1]);
      results.push(result);
    }
    return results;
  }

  loadFromDataAttribute() {
    const results: Result[] = JSON.parse(this.lineaplot.getAttribute("data") ?? "");
    this.results = results;
    this.minTime = +Infinity;
    this.maxTime = -Infinity;
    for (const result of results) {
      if (this.minTime > result.timestamps[0]) {
        this.minTime = result.timestamps[0];
      }
      if (this.maxTime < result.timestamps[result.timestamps.length - 1]) {
        this.maxTime = result.timestamps[result.timestamps.length - 1];
      }
    }
    this.#generalizeData();
    this.#updateValidDateInputs();
  }

  /**
   * Filters the Results for each LineaChart for the given timespan.
   * Passes the filtered data to the LineaCharts
   * @param startDate from where the data shall be shown
   * @param endDate to when the data shall be shown
   */
  filterAndUpdateData(
    startDate: Temporal.ZonedDateTime = this.getDatePickerStartDate(),
    endDate: Temporal.ZonedDateTime = this.getDatePickerEndDate(),
  ) {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;

    for (let i = 0; i < this.charts.length; i++) {
      const res = this.results[i];
      if (res === undefined) {
        continue;
      }
      let filteredValues = {};

      for (const key in res.values) {
        filteredValues[key] = res.values[key].filter(
          (t, j) => res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp,
        );
      }
      const filteredTimestamps = res.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      this.charts[i].setData(filteredTimestamps, filteredValues as Values);
    }
  }

  /**
   * Generalizes the data stored in the results list:
   * ensures that all Results objects have the same timestamps and fill up missing data.
   * if the first chart has data from e.g. 03:00 to 05:00 and the second from 04:00 to 06:00 after this function
   * both will have data from 03:00 to 06:00 with null values in 03:00 to 04:00 for the second and from 05:00 to 06:00 for the first
   * so we can show all available data
   */
  #generalizeData() {
    if (this.results.length === 0) {
      return;
    }
    const tsSet = new Set<number>();
    for (const res of this.results) {
      for (const t of res.timestamps) {
        tsSet.add(t);
      }
    }
    const allTimestamps = Array.from(tsSet).sort((a, b) => a - b);

    for (const res of this.results) {
      for (const key in res.values) {
        const map = new Map<number, number[]>();
        for (let i = 0; i < res.timestamps.length; i++) {
          map.set(res.timestamps[i], res.values[key][i]);
        }
        const newValues = allTimestamps.map((t) => (map.has(t) ? (map.get(t) ?? null) : null));
        res.values[key] = newValues;
      }
      // set the common timeline to all results
      res.timestamps = allTimestamps.slice();
    }
  }

  #updateValidDateInputs() {
    this.lineaplot.updateValidDateInputs();
  }

  /**
   * Clean up and remove all charts
   */
  clearCharts() {
    this.charts = [];
  }

  /**
   * Called when switching to this view
   */
  abstract onSwitchTo(): void;

  /**
   * Called when switching away from this view
   */
  abstract onSwitchFrom(): void;

  /**
   * Save the current state for potential restoration
   */
  abstract saveState(): void;

  /**
   * Handle the click on the previous button in the datepicker
   */
  abstract previous(previous: HTMLButtonElement, next: HTMLButtonElement): void;

  abstract next(previous: HTMLButtonElement, next: HTMLButtonElement): void;

  abstract select(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime): void;

  abstract getDatePickerStartDate(): Temporal.ZonedDateTime;

  abstract getDatePickerEndDate(): Temporal.ZonedDateTime;

  updateDatepickerStartEndDate(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    this.dp?.selectDate([this.zonedDateTimeToDate(startDate), this.zonedDateTimeToDate(endDate)]);
  }

  zonedDateTimeToDate(value: Temporal.ZonedDateTime): Date {
    return new Date(value.toInstant().toString());
  }

  dateToZonedDateTime(value: Date): Temporal.ZonedDateTime {
    const instant = Temporal.Instant.from(value.toISOString());
    return instant.toZonedDateTimeISO(i18n.timezone());
  }
}
