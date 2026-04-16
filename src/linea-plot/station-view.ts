import { i18n } from "../i18n";
import { LineaChart } from "./linea-chart";
import { LineaView } from "../linea-view";
import type { LineaPlot } from "../linea-plot";
import type { AirDatepickerOptions } from "air-datepicker";
import { fetchGeosphereForecast, GEOSPHERE_BBOX_OUTER } from "../data/geosphere-forecast";
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
  private forecastLatLons: (string | undefined)[] = [];

  constructor(backgroundColors: string[] = [], lineaplot: LineaPlot) {
    super(backgroundColors, lineaplot);
    this.showSurfaceHoarSeries = this.lineaplot.hasAttribute("showsurfacehoarseries");
    this.forecastLatLons = this.#parseForecastLatLons(
      this.lineaplot.getAttribute("forecast-latlon"),
    );
  }

  /**
   * Parse forecast-latlon attribute which can be:
   * - A single value: "48.5,11.3" (applies to all stations)
   * - An array: '["48.5,11.3", "47.2,10.8"]' (one per station)
   * - Mixed array: '[["48.5,11.3"], undefined]' (undefined for stations without forecast)
   */
  #parseForecastLatLons(raw: string | null): (string | undefined)[] {
    if (!raw) {
      return [];
    }

    const value = raw.trim();
    if (!value) {
      return [];
    }

    let parsed: unknown;
    try {
      // Try to parse as JSON (array format)
      if (value.startsWith("[")) {
        parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => this.#validateAndFormatLatLon(item));
        }
      }
    } catch {
      // Fall through to single value parsing
    }

    // Try to parse as single lat,lon value
    const singleValue = this.#validateAndFormatLatLon(value);
    if (singleValue) {
      return [singleValue]; // Return as array with single element
    }

    return [];
  }

  /**
   * Validate and format a single lat,lon coordinate pair
   * @returns formatted "lat,lon" string or undefined if invalid
   */
  #validateAndFormatLatLon(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.length !== 2) {
      console.warn("Invalid forecast-latlon format. Expected 'lat,lon'.", trimmed);
      return undefined;
    }

    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn("Invalid forecast-latlon coordinates. Expected numeric values.", trimmed);
      return undefined;
    }

    const bbox = GEOSPHERE_BBOX_OUTER;
    const isInsideBbox =
      lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
    if (!isInsideBbox) {
      console.warn("forecast-latlon is outside coverage bbox and will be ignored.", trimmed);
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
      const hasForecast = this.#getForecastLatLonForStation(Number(i)) !== undefined;
      let lc = new LineaChart(
        result,
        this.showTitle,
        this.showSurfaceHoarSeries,
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
        hasForecast,
      );
      this.charts.push(lc);
    }
  }

  /**
   * Get the forecast lat/lon for a specific station index
   * Handles:
   * - Array format: returns value at index, or undefined if not available
   * - Empty array: returns undefined for all
   */
  #getForecastLatLonForStation(stationIndex: number): string | undefined {
    if (this.forecastLatLons.length === 0) {
      return undefined;
    }
    if (this.forecastLatLons.length === 1) {
      return this.forecastLatLons[0];
    }
    return this.forecastLatLons[stationIndex];
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
    return this.forecastLatLons.length > 0 && this.forecastMaxTime > this.measuredMaxTime;
  }

  private async ensureForecastLoaded(): Promise<void> {
    if (this.forecastLatLons.length === 0) {
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
        // Determine which forecast lat/lon to use for each station
        const forecastsToLoad: [number, string][] = [];
        for (let i = 0; i < this.results.length; i++) {
          const latLon = this.#getForecastLatLonForStation(i);
          if (latLon) {
            forecastsToLoad.push([i, latLon]);
          }
        }

        if (forecastsToLoad.length === 0) {
          return;
        }

        const forecasts = await Promise.all(
          forecastsToLoad.map(async ([, latLon]) => {
            try {
              return await fetchGeosphereForecast(latLon);
            } catch (error) {
              console.warn(`Failed to fetch forecast for ${latLon}:`, error);
              return undefined;
            }
          }),
        );

        for (let i = 0; i < forecastsToLoad.length; i++) {
          const [stationIndex] = forecastsToLoad[i];
          const forecast = forecasts[i];
          if (!forecast) {
            continue;
          }

          this.forecastMaxTime = Math.max(
            this.forecastMaxTime,
            forecast.timestamps.at(-1) ?? -Infinity,
          );
          const result = this.results[stationIndex];
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
          const forecastHs = this.createForecastSnowHeight(
            result.values.HS,
            result.forecast.values.NS,
          );
          if (forecastHs) {
            result.forecast.values.HS = forecastHs;
          }
          result.timestamps = mergedTimestamps;
        }
        this.forecastLoaded = true;

        // Add forecast series to all charts and refresh data
        for (const chart of this.charts) {
          (chart as any).addForecastSeries();
        }
        this.enableForecastRange();
        this.filterAndUpdateData();
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

  private createForecastSnowHeight(
    measuredHs: (number | null)[] | undefined,
    accumulatedSnow: (number | null)[] | undefined,
  ): (number | null)[] | undefined {
    if (!measuredHs || !accumulatedSnow) {
      return undefined;
    }

    const firstForecastIdx = accumulatedSnow.findIndex((v) => v !== null && !Number.isNaN(v));
    if (firstForecastIdx < 0) {
      return undefined;
    }

    let hsBaseline: number | undefined = undefined;
    for (let i = firstForecastIdx; i >= 0; i--) {
      const hs = measuredHs[i];
      if (hs !== null && !Number.isNaN(hs)) {
        hsBaseline = hs;
        break;
      }
    }
    if (hsBaseline === undefined) {
      return undefined;
    }

    return accumulatedSnow.map((snow) => {
      if (snow === null) {
        return null;
      }
      if (Number.isNaN(snow)) {
        return NaN;
      }
      return hsBaseline + snow;
    });
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
    if (this.lazySrcLoaded) return;
    try {
      await this.fetchData("lazysrc");
    } catch (e) {
      if (e === "Empty src array!") return;
      throw e;
    }
    this.lazySrcLoaded = true;
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
