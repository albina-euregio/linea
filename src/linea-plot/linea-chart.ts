import uPlot from "uplot";
import {
  opts_TA,
  opts_TA_FORECAST,
  opts_TA_TD_TSS,
  opts_TD,
  opts_TD_FORECAST,
  opts_TSS,
  opts_SurfaceHoar,
} from "./opts_TA_TD_TSS";
import {
  opts_DW,
  opts_DW_FORECAST,
  opts_VW,
  opts_VW_FORECAST,
  opts_VW_MAX,
  opts_VW_MAX_FORECAST,
  opts_VW_VWG_DW,
} from "./opts_VW_VWG_DW";
import {
  opts_HS,
  opts_HS_FORECAST,
  opts_HS_PSUM,
  opts_PSUM,
  opts_PSUM_FORECAST,
} from "./opts_HS_PSUM";
import { opts_ISWR, opts_ISWR_FORECAST, opts_RH, opts_RH_FORECAST, opts_RH_GR } from "./opts_RH_GR";
import { dewPoint } from "./dew-point";
import type { ForecastValues, StationData, Values } from "../data/station-data";
import { i18n } from "../i18n";
import { AbstractLineaChart } from "../abstract-linea-chart";
import { TouchZoom } from "../shared/touch-zoom";
import { MeasurementDatesPlugin } from "../shared/measurement-dates";

export class LineaChart extends AbstractLineaChart {
  private showSurfaceHoarSeries: boolean;
  private forecastEnabled: boolean;

  private withFreshPlugins(opts: uPlot.Options): uPlot.Options {
    return {
      ...opts,
      plugins: [TouchZoom.touchZoomPlugin(), new MeasurementDatesPlugin().plugin()],
    };
  }

  constructor(
    result: StationData,
    showTitle: boolean,
    showSurfaceHoarSeries: boolean,
    backgroundColor: string,
    forecastEnabled: boolean,
  ) {
    super(backgroundColor, showTitle, result);
    this.showSurfaceHoarSeries = showSurfaceHoarSeries;
    this.forecastEnabled = forecastEnabled;
    this.createPlots().catch((e) => console.error(e));
  }

  setData(timestamps: number[], values: Values, forecast?: ForecastValues) {
    let i = 0;
    const forecastValues = forecast?.values;

    if (values.HS || values.PSUM) {
      if (values.HS && values.PSUM) {
        this.updateData(
          this.plots[i],
          [timestamps, values.HS, this.#sumupPrecipitation(timestamps, values.PSUM)].concat(
            forecastValues?.HS ? [forecastValues.HS] : [],
            forecastValues?.PSUM ? [this.#sumupPrecipitation(timestamps, forecastValues.PSUM)] : [],
          ),
        );
      } else if (values.HS) {
        this.updateData(
          this.plots[i],
          [timestamps, values.HS].concat(
            forecastValues?.HS ? [forecastValues.HS] : [],
            forecastValues?.PSUM ? [this.#sumupPrecipitation(timestamps, forecastValues.PSUM)] : [],
          ),
        );
      } else if (values.PSUM) {
        this.updateData(
          this.plots[i],
          [timestamps, this.#sumupPrecipitation(timestamps, values.PSUM)].concat(
            forecastValues?.PSUM ? [this.#sumupPrecipitation(timestamps, forecastValues.PSUM)] : [],
          ),
        );
      }
      i += 1;
    }
    if (values.VW || values.VW_MAX || values.DW) {
      this.updateData(
        this.plots[i],
        [timestamps, values.VW, values.VW_MAX, this.#filterDWData(values.DW)].concat(
          forecastValues
            ? [forecastValues.VW, forecastValues.VW_MAX, this.#filterDWData(forecastValues.DW)]
            : [],
        ),
      );
      i += 1;
    }
    if (values.TA || values.TD || values.TSS) {
      const forecastTd = this.#calculateDewPointSeries(forecastValues?.TA, forecastValues?.RH);
      if (this.showSurfaceHoarSeries && values.TD && values.TSS) {
        this.updateData(
          this.plots[i],
          [
            timestamps,
            values.TD ??
              (values.TA && values.RH
                ? values.TA.map((temp, i) => dewPoint(temp, values.RH[i]))
                : undefined),
            values.TSS,
            this.#generateSurfaceHoarData(timestamps, values.TD, values.TSS),
            values.TA,
          ].concat(forecastTd ? [forecastTd] : [], forecastValues?.TA ? [forecastValues.TA] : []),
        );
      } else {
        this.updateData(
          this.plots[i],
          [
            timestamps,
            values.TD ??
              (values.TA && values.RH
                ? values.TA.map((temp, i) => dewPoint(temp, values.RH[i]))
                : undefined),
            values.TSS,
            values.TA,
          ].concat(forecastTd ? [forecastTd] : [], forecastValues?.TA ? [forecastValues.TA] : []),
        );
      }
      i += 1;
    }
    if (values.RH || values.ISWR) {
      this.updateData(
        this.plots[i],
        [timestamps, values.RH, values.ISWR].concat(
          forecastValues ? [forecastValues.RH, forecastValues.ISWR] : [],
        ),
      );
    }
    this.resizePlots(this.clientWidth, this.style);
  }

  async createPlots() {
    this.resizeObserver.unobserve(this);
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(plot_HS_PSUM, plot_VW_VWG_DW, plot_TA_TD_TSS, plot_RH_GR);

    if (this.result.values.HS || this.result.values.PSUM) {
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_HS_PSUM,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_HS_PSUM,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:precipitation"));
      if (this.result.values.HS) {
        this.addSeries(p, opts_HS, this.result.values.HS);
      }
      if (this.result.values.PSUM) {
        this.addSeries(
          p,
          opts_PSUM,
          this.#sumupPrecipitation(this.result.timestamps, this.result.values.PSUM),
        );
      }
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_VW_VWG_DW,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_VW_VWG_DW,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:wind"));
      this.addSeries(p, opts_VW, this.result.values.VW);
      this.addSeries(p, opts_VW_MAX, this.result.values.VW_MAX);
      this.addSeries(p, opts_DW, this.#filterDWData(this.result.values.DW));
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.TA) {
      const TD =
        this.result.values.TD ??
        (this.result.values.TA && this.result.values.RH
          ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
          : undefined);
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_TA_TD_TSS,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_TA_TD_TSS,
      );
      this.drawedTitle = true;

      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:temperature"));
      this.addSeries(p, opts_TD, TD);

      // show snow surface temperature and therefore surface hoar only if available
      if (this.result.values.TSS) {
        this.addSeries(p, opts_TSS, this.result.values.TSS);
        if (this.showSurfaceHoarSeries) {
          const surfacehoar = this.#generateSurfaceHoarData(
            this.result.timestamps,
            this.result.values.TD,
            this.result.values.TSS,
          );
          this.addSeries(p, opts_SurfaceHoar, surfacehoar);
        }
      } else {
        this.addSeries(p, opts_TSS, []);
      }
      this.addSeries(p, opts_TA, this.result.values.TA);
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.RH || this.result.values.ISWR) {
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_RH_GR,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_RH_GR,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:humidity_gr"));
      this.addSeries(p, opts_RH, this.result.values.RH);
      this.addSeries(p, opts_ISWR, this.result.values.ISWR);
      // Forecast series will be added after forecast data is loaded
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  #filterDWData(values: (number | null)[] | undefined): (number | null)[] {
    if (!values) {
      return [];
    }
    let density = Math.ceil(values.length / 7500);
    let out = values.map((o, i) => (i % density == 0 ? o : null));
    return out;
  }

  /**
   * Uses the objects data to calculate the surface hoar series data.
   * Filters for surface hoar potential which is longer than 1 hour
   *
   * @returns The surface hoar data for the charts data
   */
  #generateSurfaceHoarData(
    timestamps: number[],
    TD: (number | null)[],
    TSS: (number | null)[],
  ): number[] {
    const result: number[] = [];
    const len = TD.length;

    let i = 0;
    while (i < len) {
      if (TD[i] < 0 && TSS[i] < TD[i]) {
        const startIdx = i;
        let endIdx = i;

        while (endIdx + 1 < len && TD[endIdx + 1] < 0 && TSS[endIdx + 1] < TD[endIdx + 1]) {
          endIdx++;
        }

        const duration = timestamps[endIdx] - timestamps[startIdx];
        const mark = duration >= 3600_000 ? 1000 : -100;

        for (let j = startIdx; j <= endIdx; j++) {
          result[j] = mark;
        }

        i = endIdx + 1;
      } else {
        result[i] = -100;
        i++;
      }
    }
    return result;
  }

  /**
   * Sums the precipitation until it reaches 7 o'clock, then resets to zero and starts all over.
   *
   * Handles missing data inside the precipitation data by treating them as zero.
   */
  #sumupPrecipitation(timestamps: number[], psum: (number | null)[]): number[] {
    const result: number[] = [];
    let lastWasBefore7 = true;
    let sum = 0;
    const timezone = i18n.timezone();

    for (let i = 0; i < psum.length; i++) {
      const date = Temporal.Instant.fromEpochMilliseconds(timestamps[i]).toZonedDateTimeISO(
        timezone,
      );
      if (date.hour >= 7 && lastWasBefore7) {
        lastWasBefore7 = false;
        sum = psum[i] ?? 0;
        result[i] = sum;
      } else {
        lastWasBefore7 = date.hour < 7;
        sum += psum[i] ?? 0;
        result[i] = sum;
      }
    }
    return result;
  }

  #calculateDewPointSeries(
    temperature: (number | null)[] | undefined,
    humidity: (number | null)[] | undefined,
  ): (number | null)[] | undefined {
    if (!temperature || !humidity) {
      return undefined;
    }
    return temperature.map((temp, i) => dewPoint(temp, humidity[i] ?? null));
  }

  protected getStationTitle(): {} {
    return this.showTitle && !this.drawedTitle
      ? {
          title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
        }
      : {};
  }

  /**
   * Add forecast series to all plots after forecast data has been loaded.
   * This is called after ensureForecastLoaded() completes.
   */
  addForecastSeries(): void {
    if (!this.forecastEnabled || !this.result.forecast) {
      return;
    }

    let plotIdx = 0;

    // HS/PSUM plot
    if (this.result.values.HS || this.result.values.PSUM) {
      const plot = this.plots[plotIdx];
      if (this.result.forecast.values.HS) {
        this.addSeries(plot, opts_HS_FORECAST, this.result.forecast.values.HS);
      }
      if (this.result.forecast.values.PSUM) {
        this.addSeries(
          plot,
          opts_PSUM_FORECAST,
          this.#sumupPrecipitation(
            this.result.forecast.timestamps,
            this.result.forecast.values.PSUM,
          ),
        );
      }
      plotIdx += 1;
    }

    // VW/VW_MAX/DW plot
    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      const plot = this.plots[plotIdx];
      if (this.result.forecast.values.VW) {
        this.addSeries(plot, opts_VW_FORECAST, this.result.forecast.values.VW);
      }
      if (this.result.forecast.values.VW_MAX) {
        this.addSeries(plot, opts_VW_MAX_FORECAST, this.result.forecast.values.VW_MAX);
      }
      if (this.result.forecast.values.DW) {
        this.addSeries(plot, opts_DW_FORECAST, this.#filterDWData(this.result.forecast.values.DW));
      }
      plotIdx += 1;
    }

    // TA/TD/TSS plot
    if (this.result.values.TA) {
      const plot = this.plots[plotIdx];
      const forecastTd = this.#calculateDewPointSeries(
        this.result.forecast.values.TA,
        this.result.forecast.values.RH,
      );
      if (forecastTd) {
        this.addSeries(plot, opts_TD_FORECAST, forecastTd);
      }
      if (this.result.forecast.values.TA) {
        this.addSeries(plot, opts_TA_FORECAST, this.result.forecast.values.TA);
      }
      plotIdx += 1;
    }

    // RH/ISWR plot
    if (this.result.values.RH || this.result.values.ISWR) {
      const plot = this.plots[plotIdx];
      if (this.result.forecast.values.RH) {
        this.addSeries(plot, opts_RH_FORECAST, this.result.forecast.values.RH);
      }
      if (this.result.forecast.values.ISWR) {
        this.addSeries(plot, opts_ISWR_FORECAST, this.result.forecast.values.ISWR);
      }
    }
  }
}

customElements.define("linea-chart", LineaChart);
