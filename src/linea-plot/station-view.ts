import { i18n } from "../i18n";
import type { Result, Values } from "../data/station-data";
import { LineaChart } from "./linea-chart";
import { LineaView } from "./linea-view";
import type { LineaPlot } from "../linea-plot";

/**
 * Station View - displays non-winter station data with interactive filtering
 */
export class StationView extends LineaView {
  private lazysrcs: string[] = [];
  private savedStartDate: Temporal.ZonedDateTime | undefined;
  private savedEndDate: Temporal.ZonedDateTime | undefined;
  private savedDateFormat: string = "";
  private showSurfaceHoarSeries: boolean = false;

  constructor(backgroundColors: string[] = [], lineaplot: LineaPlot) {
    super(backgroundColors, lineaplot);
    this.showSurfaceHoarSeries = this.lineaplot.hasAttribute("showsurfacehoarseries");
  }

  /**
   * Initialize the station view with data from src and lazysrc
   */
  async initialize() {
    if (this.lineaplot.hasAttribute("data")) {
      console.warn("Data attribute is deprecated, please use src and lazysrc attributes instead.");
      this.results = JSON.parse(this.lineaplot.getAttribute("data") ?? "[]") as Result[];
    } else {
      this.results = await this.fetchData("src");
      this.fetchData("lazysrc").then((lazyResults) => {
        this.lazysrcs = this.srcs;
        this.srcs = [];
        this.results = lazyResults;
      });
    }
  }

  public show() {
    this.clearCharts();
    if (this.lineaplot.hasAttribute("backgroundcolors")) {
      this.backgroundColors = JSON.parse(this.lineaplot.getAttribute("backgroundcolors") ?? "");
    }
    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(
        result,
        this.showTitle,
        this.showSurfaceHoarSeries,
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
      );
      this.charts.push(lc);
      this.lineaplot.appendChild(lc);
      this.lineaplot.setStartEndDateTo(
        result.timestamps[0],
        result.timestamps[result.timestamps.length - 1],
      );
    }
    this.filterAndUpdateData();
  }
  /**
   * Get the lazy sources
   */
  getLazySources(): string[] {
    return this.lazysrcs;
  }

  /**
   * Update results and recreate charts
   */
  updateResults(results: Result[]) {
    this.results = results;
  }

  /**
   * Filter and update data in all charts
   */
  filterAndUpdateData(
    startDate: Temporal.ZonedDateTime = this.getDatePickerStartDate(),
    endDate: Temporal.ZonedDateTime = this.getDatePickerEndDate(),
  ): void {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;

    for (let i = 0; i < this.charts.length; i++) {
      const res = this.results[i];
      if (res === undefined) {
        continue;
      }
      let filteredValues: Record<string, (number | null)[]> = {};

      for (const key in res.values) {
        (filteredValues as any)[key] = (res.values as any)[key].filter(
          (_t: any, j: number) =>
            res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp,
        );
      }
      const filteredTimestamps = res.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      this.charts[i].setData(filteredTimestamps, filteredValues as Values);
    }
  }

  /**
   * Save current state when switching away
   */
  saveState(): void {
    if (this.dp) {
      this.savedDateFormat = (this.dp as any).locale.dateFormat;
      this.savedStartDate = this.getDatePickerStartDate();
      this.savedEndDate = this.getDatePickerEndDate();
    }
  }

  /**
   * Called when switching to this view
   */
  onSwitchTo(): void {
    if (this.dp && this.savedDateFormat && this.savedStartDate && this.savedEndDate) {
      this.dp.update({
        dateFormat: this.savedDateFormat,
        onShow: () => {},
        onSelect: () => {
          this.filterAndUpdateData();
        },
      });
      (this.dp as any).disabled = false;
      this.updateDatepickerStartEndDate(this.savedStartDate, this.savedEndDate);
    }
  }

  /**
   * Called when switching away from this view
   */
  onSwitchFrom(): void {
    this.saveState();
  }

  select(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    this.updateDatepickerStartEndDate(startDate, endDate);
    this.filterAndUpdateData(startDate, endDate);
  }

  previous(previous: HTMLButtonElement, next: HTMLButtonElement): void {
    const start = this.dateToZonedDateTime(this.dp.selectedDates[0]);
    const end = this.dateToZonedDateTime(this.dp.selectedDates[1]);
    if (!start || !end) return;
    next.disabled = false;
    let newEnd = end.subtract({ days: 1 });
    let newStart = start.subtract({ days: 1 });
    if (newStart.toInstant().epochMilliseconds < this.minTime) {
      newStart = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
      previous.disabled = true;
      newEnd = end;
    } else if (newStart.toInstant().epochMilliseconds > this.maxTime) {
      this.lineaplot.setStartEndDateToMinMax();
      this.filterAndUpdateData();
      return;
    }
    this.select(newStart, newEnd);
  }

  next(previous: HTMLButtonElement, next: HTMLButtonElement): void {
    const start = this.dateToZonedDateTime(this.dp.selectedDates[0]);
    const end = this.dateToZonedDateTime(this.dp.selectedDates[1]);
    if (!start || !end) return;
    previous.disabled = false;
    let newStart = start.add({ days: 1 });
    let newEnd = end.add({ days: 1 });
    if (newEnd.toInstant().epochMilliseconds > this.maxTime) {
      newEnd = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
      next.disabled = true;
      newStart = start;
    } else if (newEnd.toInstant().epochMilliseconds < this.minTime) {
      this.lineaplot.setStartEndDateToMinMax();
      this.filterAndUpdateData();
      return;
    }
    this.select(newStart, newEnd);
  }

  getDatePickerStartDate(): Temporal.ZonedDateTime {
    if (!this.dp) {
      return Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
    }
    const date: Date = this.dp.selectedDates[0];
    date.setHours(0);
    date.setMinutes(0);
    return this.dateToZonedDateTime(date);
  }

  getDatePickerEndDate(): Temporal.ZonedDateTime {
    if (!this.dp) {
      return Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
    }
    let date: Date;
    if (this.dp.selectedDates.length == 1) {
      date = this.dp.selectedDates[0];
    } else {
      date = this.dp.selectedDates[1];
    }
    return this.dateToZonedDateTime(date).add({ days: 1 });
  }
}
