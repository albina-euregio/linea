import { i18n } from "../i18n";
import { LineaChart } from "./linea-chart";
import { LineaView } from "../linea-view";
import type { LineaPlot } from "../linea-plot";
import type { AirDatepickerOptions } from "air-datepicker";
import { fetchGeosphereForecast } from "../data/geosphere-forecast";
import { type ParameterType, type Values } from "../data/station-data";

/**
 * Station View - displays non-winter station data with interactive filtering
 */
export class StationView extends LineaView {
  private savedStartDate: Temporal.ZonedDateTime | undefined;
  private savedEndDate: Temporal.ZonedDateTime | undefined;
  private savedDateFormat: string = "";
  private showSurfaceHoarSeries: boolean = false;
  private measuredMaxTime: number = -Infinity;
  private forecastMaxTime: number = -Infinity;
  private forecastLoaded: boolean = false;
  private forecastLoadPromise: Promise<void> | undefined;
  private forecastLatLon: string | undefined;

  constructor(backgroundColors: string[] = [], lineaplot: LineaPlot) {
    super(backgroundColors, lineaplot);
    this.showSurfaceHoarSeries = this.lineaplot.hasAttribute("showsurfacehoarseries");
    this.forecastLatLon = this.#parseForecastLatLon(this.lineaplot.getAttribute("forecast-latlon"));
  }

  #parseForecastLatLon(raw: string | null): string | undefined {
    if (!raw) {
      return undefined;
    }
    const value = raw.trim();
    if (!value) {
      return undefined;
    }

    const parts = value.split(",").map((part) => part.trim());
    if (parts.length !== 2) {
      console.warn("Invalid forecast-latlon format. Expected 'lat,lon'.", value);
      return undefined;
    }

    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn("Invalid forecast-latlon coordinates. Expected numeric values.", value);
      return undefined;
    }

    return `${lat},${lon}`;
  }

  /**
   * Initialize the station view with data from src and lazysrc
   */
  async initialize() {
    if (this.lineaplot.hasAttribute("data")) {
      this.loadFromDataAttribute();
    } else {
      await this.fetchData("src");
    }

    this.measuredMaxTime = this.maxTime;

    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(
        result,
        this.showTitle,
        this.showSurfaceHoarSeries,
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
        Boolean(this.forecastLatLon),
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

    this.maxTime = this.measuredMaxTime;
    this.lineaplot.setStartEndDateTo(this.minTime, this.measuredMaxTime);
    this.filterAndUpdateData();
  }

  private hasForecastRange(): boolean {
    return Boolean(this.forecastLatLon) && this.forecastMaxTime > this.measuredMaxTime;
  }

  private async ensureForecastLoaded(): Promise<void> {
    if (!this.forecastLatLon) {
      return;
    }
    if (this.forecastLoaded) {
      return;
    }
    if (this.forecastLoadPromise) {
      await this.forecastLoadPromise;
      return;
    }

    this.forecastLoadPromise = (async () => {
      try {
        const forecastLatLon = this.forecastLatLon;
        if (!forecastLatLon) {
          return;
        }
        const forecast = await fetchGeosphereForecast(forecastLatLon);
        this.forecastMaxTime = forecast.timestamps.at(-1) ?? -Infinity;

        for (const result of this.results) {
          const mergedTimestamps = [
            ...new Set([...result.timestamps, ...forecast.timestamps]),
          ].sort((a, b) => a - b);

          result.values = this.alignValuesToTimeline(
            result.timestamps,
            result.values,
            mergedTimestamps,
          );
          result.forecast = {
            timestamps: mergedTimestamps,
            values: this.alignValuesToTimeline(
              forecast.timestamps,
              forecast.values,
              mergedTimestamps,
            ),
          };
          result.timestamps = mergedTimestamps;
        }

        this.forecastLoaded = true;
      } catch (error) {
        console.warn("Failed to fetch Geosphere forecast data", error);
      } finally {
        this.forecastLoadPromise = undefined;
      }
    })();

    await this.forecastLoadPromise;
  }

  private alignValuesToTimeline(
    sourceTimestamps: number[],
    sourceValues: Values,
    targetTimestamps: number[],
  ): Values {
    const aligned: Values = {};

    for (const key of Object.keys(sourceValues) as ParameterType[]) {
      const sourceSeries = sourceValues[key] ?? [];
      const byTime = new Map<number, number | null>();
      for (let i = 0; i < sourceTimestamps.length; i++) {
        byTime.set(sourceTimestamps[i], sourceSeries[i] ?? null);
      }
      aligned[key] = targetTimestamps.map((t) => (byTime.has(t) ? (byTime.get(t) ?? null) : NaN));
    }

    return aligned;
  }

  private enableForecastRange(): void {
    if (!this.hasForecastRange()) {
      return;
    }
    this.maxTime = this.forecastMaxTime;
    this.lineaplot.updateValidDateInputs();
  }

  /**
   * Called when switching to this view
   */
  onSwitchTo(): void {
    if (this.dp) {
      const options: Partial<AirDatepickerOptions> = {
        onShow: () => {},
        onSelect: () => {
          this.filterAndUpdateData();
        },
      };
      if (this.savedDateFormat) {
        options.dateFormat = this.savedDateFormat;
      }
      this.dp.update(options);
      (this.dp as any).disabled = false;
      if (this.savedStartDate && this.savedEndDate) {
        this.updateDatepickerStartEndDate(
          this.savedStartDate,
          this.savedEndDate.subtract({ days: 1 }),
        );
      }
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
    this.updateDatepickerStartEndDate(startDate, endDate);
    this.filterAndUpdateData(startDate, endDate);
  }

  private lazySrcLoaded = false;
  async fetchLazySrc() {
    if (this.lineaplot.hasAttribute("lazysrc") && !this.lazySrcLoaded) {
      await this.fetchData("lazysrc");
      this.lazySrcLoaded = true;
    }
  }

  previous(previous: HTMLButtonElement, next: HTMLButtonElement): void {
    this.lineaplot.runWithButtonLoading(previous, () => this.previous0(previous, next));
  }

  private async previous0(previous: HTMLButtonElement, next: HTMLButtonElement) {
    await this.fetchLazySrc();
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
    this.lineaplot.runWithButtonLoading(next, () => this.next0(previous, next));
  }

  private async next0(previous: HTMLButtonElement, next: HTMLButtonElement): Promise<void> {
    if (!this.dp || !this.dp.selectedDates || this.dp.selectedDates.length < 2) return;
    const start = this.dateToZonedDateTime(new Date(this.dp.selectedDates[0]));
    const end = this.dateToZonedDateTime(new Date(this.dp.selectedDates[1]));
    if (!start || !end) return;
    previous.disabled = false;
    let newStart = start.add({ days: 1 });
    let newEnd = end.add({ days: 1 });

    if (newEnd.toInstant().epochMilliseconds > this.maxTime && !this.forecastLoaded) {
      await this.ensureForecastLoaded();
    }

    if (newEnd.toInstant().epochMilliseconds > this.maxTime && this.hasForecastRange()) {
      this.enableForecastRange();
    }

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
