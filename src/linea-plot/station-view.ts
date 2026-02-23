import { i18n } from "../i18n";
import type { Result, Values } from "../data/station-data";
import { LineaChart } from "./linea-chart";
import { LineaView } from "./linea-view";
import type { LineaPlot } from "../linea-plot";

/**
 * Station View - displays non-winter station data with interactive filtering
 */
export class StationView extends LineaView {
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
      this.results = JSON.parse(this.lineaplot.getAttribute("data") ?? "[]") as Result[];
    } else {
      this.results = await this.fetchData("src");
      if (this.lineaplot.hasAttribute("lazysrc")) {
        this.fetchData("lazysrc").then((lazyResults) => {
          this.results = lazyResults;
        });
      }
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
    }
  }

  public show() {
    if (this.lineaplot.hasAttribute("backgroundcolors")) {
      this.backgroundColors = JSON.parse(this.lineaplot.getAttribute("backgroundcolors") ?? "");
    }

    for (const chart of this.charts) {
      this.lineaplot.appendChild(chart);
    }

    this.lineaplot.setStartEndDateTo(this.minTime, this.maxTime);
    this.filterAndUpdateData();
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
    if (this.dp) {
      this.savedDateFormat = (this.dp as any).locale.dateFormat;
      this.savedStartDate = this.getDatePickerStartDate();
      this.savedEndDate = this.getDatePickerEndDate();
    }
  }

  select(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    console.log("select", startDate, endDate);
    this.updateDatepickerStartEndDate(startDate, endDate);
    this.filterAndUpdateData(startDate, endDate);
  }

  previous(previous: HTMLButtonElement, next: HTMLButtonElement): void {
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length < 2) return;
    const start = this.dateToZonedDateTime(new Date(this.dp.selectedDates[0]));
    const end = this.dateToZonedDateTime(new Date(this.dp.selectedDates[1]));
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
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length < 2) return;
    const start = this.dateToZonedDateTime(new Date(this.dp.selectedDates[0]));
    const end = this.dateToZonedDateTime(new Date(this.dp.selectedDates[1]));
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
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length === 0) {
      return Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
    }
    // Create a copy to avoid mutating the datepicker's internal date
    const date = new Date(this.dp.selectedDates[0]);
    date.setHours(0);
    date.setMinutes(0);
    return this.dateToZonedDateTime(date);
  }

  getDatePickerEndDate(): Temporal.ZonedDateTime {
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length === 0) {
      return Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
    }
    let date: Date;
    if (this.dp.selectedDates.length == 1) {
      // Create a copy to avoid any potential issues
      date = new Date(this.dp.selectedDates[0]);
    } else {
      date = new Date(this.dp.selectedDates[1]);
    }
    return this.dateToZonedDateTime(date).add({ days: 1 });
  }
}
