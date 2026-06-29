import uPlot from "uplot";
import * as opts_TA_TD_TSS from "./opts_TA_TD_TSS";
import * as opts_VW_VWG_DW from "./opts_VW_VWG_DW";
import * as opts_HS_PSUM from "./opts_HS_PSUM";
import * as opts_RH_GR from "./opts_RH_GR";
import { dewPoint } from "./dew-point";
import type { StationData } from "../data/station-data";
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

  setData(data: StationData) {
    const { timestamps, values, forecast } = data;
    let i = 0;
    const forecastValues = forecast?.values;

    if (values.HS || values.PSUM) {
      const measuredPsumAccum = values.PSUM
        ? this.#sumupPrecipitation(timestamps, values.PSUM)
        : undefined;
      const forecastPsumAccum =
        forecastValues?.PSUM && measuredPsumAccum
          ? this.#sumupForecastPrecipitation(timestamps, forecastValues.PSUM, measuredPsumAccum)
          : [];

      if (values.HS && values.PSUM) {
        this.updateData(
          this.plots[i],
          [timestamps, values.HS, measuredPsumAccum].concat(
            forecastValues?.HS ? [forecastValues.HS] : [],
            forecastPsumAccum ? [forecastPsumAccum] : [],
          ),
        );
      } else if (values.HS) {
        this.updateData(
          this.plots[i],
          [timestamps, values.HS].concat(
            forecastValues?.HS ? [forecastValues.HS] : [],
            forecastPsumAccum ? [forecastPsumAccum] : [],
          ),
        );
      } else if (values.PSUM) {
        this.updateData(
          this.plots[i],
          [timestamps, measuredPsumAccum].concat(forecastPsumAccum ? [forecastPsumAccum] : []),
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
                ? this.#calculateDewPointSeries(values.TA, values.RH)
                : undefined),
            values.TSS,
            data.generateSurfaceHoarData(),
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
                ? this.#calculateDewPointSeries(values.TA, values.RH)
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
          ...opts_HS_PSUM.opts_HS_PSUM,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_HS_PSUM,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:precipitation"));
      if (this.result.values.HS) {
        this.addSeries(p, opts_HS_PSUM.HS.series, this.result.values.HS);
      }
      if (this.result.values.PSUM) {
        this.addSeries(
          p,
          opts_HS_PSUM.PSUM.series,
          this.#sumupPrecipitation(this.result.timestamps, this.result.values.PSUM),
        );
      }
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_VW_VWG_DW.opts_VW_VWG_DW,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_VW_VWG_DW,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:wind"));
      this.addSeries(p, opts_VW_VWG_DW.VW.series, this.result.values.VW);
      this.addSeries(p, opts_VW_VWG_DW.opts_VW_MAX, this.result.values.VW_MAX);
      this.addSeries(p, opts_VW_VWG_DW.DW.series, this.#filterDWData(this.result.values.DW));
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.TA) {
      const TD =
        this.result.values.TD ??
        (this.result.values.TA && this.result.values.RH
          ? this.#calculateDewPointSeries(this.result.values.TA, this.result.values.RH)
          : undefined);
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_TA_TD_TSS.opts_TA_TD_TSS,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_TA_TD_TSS,
      );
      this.drawedTitle = true;

      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:temperature"));
      this.addSeries(p, opts_TA_TD_TSS.TD.series, TD);

      // show snow surface temperature and therefore surface hoar only if available
      if (this.result.values.TSS) {
        this.addSeries(p, opts_TA_TD_TSS.TSS.series, this.result.values.TSS);
        if (this.showSurfaceHoarSeries) {
          const surfacehoar = this.result.generateSurfaceHoarData();
          this.addSeries(p, opts_TA_TD_TSS.SurfaceHoar.series, surfacehoar);
        }
      } else {
        this.addSeries(p, opts_TA_TD_TSS.TSS.series, []);
      }
      this.addSeries(p, opts_TA_TD_TSS.TA.series, this.result.values.TA);
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.RH || this.result.values.ISWR) {
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_RH_GR.opts_RH_GR,
          ...this.getStationTitle(),
        }),
        [this.result.timestamps],
        plot_RH_GR,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:humidity_gr"));
      this.addSeries(p, opts_RH_GR.RH.series, this.result.values.RH);
      this.addSeries(p, opts_RH_GR.ISWR.series, this.result.values.ISWR);
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

  #sumupForecastPrecipitation(
    timestamps: number[],
    forecastPsum: (number | null)[],
    measuredAccum: number[],
  ): (number | null)[] {
    const result: (number | null)[] = [];
    let started = false;
    let sum = 0;
    const timezone = i18n.timezone();

    for (let i = 0; i < forecastPsum.length; i++) {
      const value = forecastPsum[i];
      const isMissing = value === null || Number.isNaN(value);

      if (!started) {
        if (isMissing) {
          result[i] = NaN;
          continue;
        }

        const baseline = this.#findLastMeasuredAccum(measuredAccum, i);
        sum = baseline + value;
        started = true;
        result[i] = sum;
        continue;
      }

      const prevDate = Temporal.Instant.fromEpochMilliseconds(timestamps[i - 1]).toZonedDateTimeISO(
        timezone,
      );
      const currentDate = Temporal.Instant.fromEpochMilliseconds(timestamps[i]).toZonedDateTimeISO(
        timezone,
      );
      const crossedSeven = prevDate.hour < 7 && currentDate.hour >= 7;

      if (crossedSeven) {
        sum = isMissing ? 0 : value;
      } else if (!isMissing) {
        sum += value;
      }

      result[i] = isMissing ? sum : sum;
    }

    return result;
  }

  #findLastMeasuredAccum(measuredAccum: number[], atIndex: number): number {
    for (let i = atIndex; i >= 0; i--) {
      const value = measuredAccum[i];
      if (!Number.isNaN(value)) {
        return value;
      }
    }
    return 0;
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
        this.addSeries(plot, opts_HS_PSUM.HS.forecast, this.result.forecast.values.HS);
      }
      if (this.result.forecast.values.PSUM) {
        this.addSeries(
          plot,
          opts_HS_PSUM.PSUM.forecast,
          this.result.values.PSUM
            ? this.#sumupForecastPrecipitation(
                this.result.forecast.timestamps,
                this.result.forecast.values.PSUM,
                this.#sumupPrecipitation(this.result.forecast.timestamps, this.result.values.PSUM),
              )
            : this.#sumupPrecipitation(
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
        this.addSeries(plot, opts_VW_VWG_DW.VW.forecast, this.result.forecast.values.VW);
      }
      if (this.result.forecast.values.VW_MAX) {
        this.addSeries(
          plot,
          opts_VW_VWG_DW.opts_VW_MAX_FORECAST,
          this.result.forecast.values.VW_MAX,
        );
      }
      if (this.result.forecast.values.DW) {
        this.addSeries(
          plot,
          opts_VW_VWG_DW.DW.forecast,
          this.#filterDWData(this.result.forecast.values.DW),
        );
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
        this.addSeries(plot, opts_TA_TD_TSS.TD.forecast, forecastTd);
      }
      if (this.result.forecast.values.TA) {
        this.addSeries(plot, opts_TA_TD_TSS.TA.forecast, this.result.forecast.values.TA);
      }
      plotIdx += 1;
    }

    // RH/ISWR plot
    if (this.result.values.RH || this.result.values.ISWR) {
      const plot = this.plots[plotIdx];
      if (this.result.forecast.values.RH) {
        this.addSeries(plot, opts_RH_GR.RH.forecast, this.result.forecast.values.RH);
      }
      if (this.result.forecast.values.ISWR) {
        this.addSeries(plot, opts_RH_GR.ISWR.forecast, this.result.forecast.values.ISWR);
      }
    }
  }
}

customElements.define("linea-chart", LineaChart);
