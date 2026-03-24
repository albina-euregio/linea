import {
  type StationData,
  type Values,
  ParameterType,
  StationDataArray,
} from "./data/station-data";
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
  results = new StationDataArray();
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

    const results = new StationDataArray();
    for (const src of this.srcs) {
      const result = await fetchSMET(src);
      this.minTime = Math.min(this.minTime, result.timestamps[0]);
      this.maxTime = Math.max(this.maxTime, result.timestamps.at(-1));
      results.push(result);
    }
    this.results.mergeWith(results);
    this.results.generalize();
    this.lineaplot.updateValidDateInputs();
  }

  /**
   * Loads the data from the "data" attribute, which is expected to be a JSON string representing an array of Result objects.
   * It also updates the min and max time of the data and generalizes the data so that all results have the same timestamps with null values for missing data.
   * Finally, it updates the valid date inputs in the LineaPlot.
   * This method is used when the data is directly provided in the HTML and no fetching from a source is needed.
   */
  loadFromDataAttribute() {
    const results: StationData[] = JSON.parse(this.lineaplot.getAttribute("data") ?? "");
    this.results = new StationDataArray(...results);
    this.minTime = +Infinity;
    this.maxTime = -Infinity;
    for (const result of results) {
      if (this.minTime > result.timestamps[0]) {
        this.minTime = result.timestamps[0];
      }
      if (this.maxTime < result.timestamps.at(-1)) {
        this.maxTime = result.timestamps.at(-1);
      }
    }
    this.results.generalize();
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
      let filteredValues: Values = {};

      let key: ParameterType;
      for (key in res.values) {
        filteredValues[key] = res.values[key].filter(
          (_, j) => res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp,
        );
      }
      const filteredTimestamps = res.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      this.charts[i].setData(filteredTimestamps, filteredValues as Values);
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
