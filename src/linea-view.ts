import type { Result, Values } from "./data/station-data";
import { fetchSMET } from "./data/smet-data";
import type { AbstractLineaChart } from "./abstract-linea-chart";
import type AirDatepicker from "air-datepicker";
import type { LineaPlot } from "./linea-plot";
import { i18n } from "./i18n";

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

  /**
   * This method is called on each switching of views and is responsible for rendering the charts in the current view and updating the datepicker if available.
   * It is important to note that this method can be called multiple times and should not create new charts or datepickers if they already exist,
   * but rather update the existing ones.
   */
  abstract show(): void;

  /**
   * Get all charts in this view
   */
  getCharts(): AbstractLineaChart[] {
    return this.charts;
  }

  /**
   * Fetch data from sources and stores it into the results.
   * Also updates the min and max time of the data and generalizes the data so that all results have the same timestamps with null values for missing data.
   * Finally, it updates the valid date inputs in the LineaPlot.
   * @param attribute the attribute from which to fetch the data (e.g. "src" or "wintersrc")
   */
  async fetchData(attribute: string) {
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
    this.results = this.#mergeResults(results);
    this.#generalizeData();
    this.lineaplot.updateValidDateInputs();
  }

  /**
   * Merges the results from the new fetch with the existing results in the view.
   * Mainly implemented to integrate the lazy source data into the existing one.
   * The first loaded data decides about the keys to show.
   * @param newResults The results to integrate into the this.results.
   * It is assumed that the order of the results in the newResults array corresponds to the order of the results in the this.results array.
   *
   * The merged data is stored in the this.result object.
   * @return Result[] - The merged results
   */
  #mergeResults(newResults: Result[]): Result[] {
    if (this.results.length === 0) {
      return newResults;
    }

    const results: Result[] = [];
    for (let i = 0; i < this.results.length; i++) {
      const oldResult = this.results[i];
      const newResult = newResults[i];
      if (oldResult === undefined || newResult === undefined) {
        continue;
      }
      const oldTimestamps = oldResult.timestamps;
      const newTimestamps = newResult.timestamps;
      const mergedTimestamps = [...new Set([...oldTimestamps, ...newTimestamps])].sort(
        (a, b) => a - b,
      );

      const oldIndexMap = new Map<number, number>();
      for (let j = 0; j < oldTimestamps.length; j++) {
        oldIndexMap.set(oldTimestamps[j], j);
      }
      const newIndexMap = new Map<number, number>();
      for (let j = 0; j < newTimestamps.length; j++) {
        newIndexMap.set(newTimestamps[j], j);
      }

      const mergedValues: Values = {};
      const keys = Object.keys(oldResult.values);

      for (const key of keys) {
        mergedValues[key] = Array.from({ length: mergedTimestamps.length });
      }

      for (let t = 0; t < mergedTimestamps.length; t++) {
        const timestamp = mergedTimestamps[t];
        const oldIndex = oldIndexMap.get(timestamp);
        const newIndex = newIndexMap.get(timestamp);

        for (const key of keys) {
          if (oldIndex !== undefined) {
            mergedValues[key][t] = oldResult.values[key][oldIndex];
          } else if (newIndex !== undefined) {
            mergedValues[key][t] = newResult.values[key][newIndex];
          } else {
            mergedValues[key][t] = null;
          }
        }
      }

      results.push({
        ...oldResult,
        timestamps: mergedTimestamps,
        values: mergedValues,
      });
    }
    return results;
  }

  /**
   * Loads the data from the "data" attribute, which is expected to be a JSON string representing an array of Result objects.
   * It also updates the min and max time of the data and generalizes the data so that all results have the same timestamps with null values for missing data.
   * Finally, it updates the valid date inputs in the LineaPlot.
   * This method is used when the data is directly provided in the HTML and no fetching from a source is needed.
   */
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
    this.lineaplot.updateValidDateInputs();
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
      console.log(this.results);
      console.warn("No results to generalize");
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
        const newValues = allTimestamps.map((t) => (map.has(t) ? (map.get(t) ?? null) : NaN));
        res.values[key] = newValues;
      }
      // set the common timeline to all results
      res.timestamps = allTimestamps.slice();
    }
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
  onSwitchTo() {}

  /**
   * Called when switching away from this view
   */
  onSwitchFrom() {}

  /**
   * Handle the click on the previous button in the datepicker
   */
  abstract previous(previous: HTMLButtonElement, next: HTMLButtonElement): void;

  /**
   * Handles the click on the next button in the datepicker
   */
  abstract next(previous: HTMLButtonElement, next: HTMLButtonElement): void;

  /**
   * Selects the given timespan in the datepicker and updates the charts to show the data for this timespan.
   * @param startDate  from where the data shall be shown
   * @param endDate  to when the data shall be shown
   */
  abstract select(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime): void;

  /**
   * Returns the start date currently selected in the datepicker.
   */
  abstract getDatePickerStartDate(): Temporal.ZonedDateTime;

  /**
   * Returns the end date currently selected in the datepicker.
   */
  abstract getDatePickerEndDate(): Temporal.ZonedDateTime;

  /**
   * Updates the datepicker to select the given start and end date and updates the charts to show the data for this timespan.
   * @param startDate  from where the data shall be shown
   * @param endDate  to when the data shall be shown
   */
  updateDatepickerStartEndDate(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    this.dp?.selectDate([this.zonedDateTimeToDate(startDate), this.zonedDateTimeToDate(endDate)]);
  }

  /**
   * Provides a utility function to convert a Temporal.ZonedDateTime to a JavaScript Date object, which is needed for the AirDatepicker.
   * @param value  the Temporal.ZonedDateTime to convert
   * @returns  the corresponding JavaScript Date object
   */
  zonedDateTimeToDate(value: Temporal.ZonedDateTime): Date {
    return new Date(value.toInstant().toString());
  }

  /**
   * Provides a utility function to convert a JavaScript Date object to a Temporal.ZonedDateTime, which is needed for handling the selected dates from the AirDatepicker.
   * @param value  the JavaScript Date to convert
   * @returns  the corresponding Temporal.ZonedDateTime object
   */
  dateToZonedDateTime(value: Date): Temporal.ZonedDateTime {
    const instant = Temporal.Instant.from(value.toISOString());
    return instant.toZonedDateTimeISO(i18n.timezone());
  }
}
