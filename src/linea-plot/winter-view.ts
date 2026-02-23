import { i18n } from "../i18n";
import { LineaYearChart } from "./linea-year-chart";
import { LineaView } from "./linea-view";
import type { LineaPlot } from "../linea-plot";

/**
 * Winter View - displays winter season data overview
 */
export class WinterView extends LineaView {
  constructor(backgroundColors: string[] = [], lineaplot: LineaPlot) {
    super(backgroundColors, lineaplot);
  }

  /**
   * Initialize the winter view with winter data
   */
  async initialize(): Promise<void> {
    if (this.lineaplot.hasAttribute("data")) {
      this.loadFromDataAttribute();
    } else {
      this.results = await this.fetchData("wintersrc");
    }
  }

  /**
   * Renders the winter view
   */
  show() {
    const [startDate, endDate] = this.#getWinterDates();
    for (const i in this.results) {
      const lcy = new LineaYearChart(
        this.results[i],
        true,
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
        startDate.toPlainDate(),
        endDate.toPlainDate(),
      );
      this.charts.push(lcy);
      this.lineaplot.appendChild(lcy);
    }

    if (this.dp) {
      this.dp.update({
        dateFormat: "yyyy",
      });
      this.updateDatepickerStartEndDate(startDate, endDate);
    }
  }

  /**
   * Filter and update data in all charts (winter view uses year selection)
   */
  filterAndUpdateData(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime): void {
    for (const chart of this.charts) {
      if (chart instanceof LineaYearChart) {
        chart.updateStartEndDate(startDate, endDate);
      }
    }
  }

  /**
   * Called when switching to this view
   */
  onSwitchTo(): void {
    if (this.dp) {
      this.dp.update({
        dateFormat: "yyyy",
        onShow: () => {
          requestAnimationFrame(() => this.dp.hide());
        },
        onSelect: () => {},
      });
      const [startDate, endDate] = this.#getWinterDates();
      this.dp.selectDate([this.zonedDateTimeToDate(startDate), this.zonedDateTimeToDate(endDate)]);
    }
  }

  select(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime): void {
    this.updateDatepickerStartEndDate(startDate, endDate);
    this.filterAndUpdateData(startDate, endDate);
  }

  getDatePickerStartDate(): Temporal.ZonedDateTime {
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length === 0) {
      return Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
    }
    const date = new Date(this.dp.selectedDates[0]);
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
      date = new Date(this.dp.selectedDates[0]);
    } else {
      date = new Date(this.dp.selectedDates[1]);
    }
    return this.dateToZonedDateTime(date);
  }

  previous(previous: HTMLButtonElement, next: HTMLButtonElement): void {
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length < 2) return;
    const start = this.dateToZonedDateTime(new Date(this.dp.selectedDates[0]));
    const end = this.dateToZonedDateTime(new Date(this.dp.selectedDates[1]));
    if (!start || !end) return;
    next.disabled = false;
    let newEnd = end.subtract({ years: 1 });
    let newStart = start.subtract({ years: 1 });
    if (newStart.toInstant().epochMilliseconds < this.minTime) {
      previous.disabled = true;
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
    let newEnd = end.add({ years: 1 });
    let newStart = start.add({ years: 1 });
    if (newStart.toInstant().epochMilliseconds > this.maxTime) {
      next.disabled = true;
      return;
    }
    this.select(newStart, newEnd);
  }
  /**
   * Determines the winter season date range based on the current date.
   *
   * If the current date is after October 1st, returns the winter season from October 1st
   * of the current year to July 1st of the next year. Otherwise, returns the winter season
   * from Ocotber 1st of the previous year to July 1st of the current year.
   *
   * Also stores the current datepicker format and start/end dates for restoration when
   * switching back from winter view.
   *
   * @returns {[Temporal.ZonedDateTime, Temporal.ZonedDateTime]} A tuple containing the start
   * date (october 1st) and end date (July 1th) of the winter season in the configured timezone
   *
   * @example
   * // If today is November 15, 2024
   * const [start, end] = this.#getWinterDates();
   * // Returns: [2024-11-01T00:00:00+00:00, 2025-04-30T00:00:00+00:00]
   */
  #getWinterDates(): [Temporal.ZonedDateTime, Temporal.ZonedDateTime] {
    // get today and decide:
    // if after september 30th, select next season (10-01 to 07-01 of next year)
    // else select this season
    const today = Temporal.Now.plainDateISO();
    const currentYear = today.year;
    const octoberThirtyfirst = Temporal.PlainDate.from(`${currentYear}-10-01`);

    let winterStartYear = currentYear;
    let winterEndYear = currentYear + 1;

    if (Temporal.PlainDate.compare(today, octoberThirtyfirst) > 0) {
      winterStartYear = currentYear;
      winterEndYear = currentYear + 1;
    } else {
      winterStartYear = currentYear - 1;
      winterEndYear = currentYear;
    }
    return [
      Temporal.PlainDate.from(`${winterStartYear}-10-01`).toZonedDateTime(i18n.timezone()),
      Temporal.PlainDate.from(`${winterEndYear}-07-01`).toZonedDateTime(i18n.timezone()),
    ];
  }
}
