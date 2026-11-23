import uPlot from "uplot";
import * as opts_TA_TD_TSS from "./opts_TA_TD_TSS";
import * as opts_VW_VWG_DW from "./opts_VW_VWG_DW";
import * as opts_HS_PSUM from "./opts_HS_PSUM";
import * as opts_RH_GR from "./opts_RH_GR";
import { dewPoint } from "./dew-point";
import { type ParameterType, type Series, seriesOf, type StationData } from "../data/station-data";
import { i18n } from "../i18n";
import { AbstractLineaChart } from "../abstract-linea-chart";
import { TouchZoom } from "../shared/touch-zoom";
import { MeasurementDatesPlugin, type MeasurementSelection } from "../shared/measurement-dates";
import { profilerPlugin } from "../shared/profiler";
import { LineaOptsHelper } from "./linea-opts-helper";
import type { ForecastOption } from "./forecast-option";
import type { LineaChartParameter } from "./linea-chart-parameter";

export class LineaChart extends AbstractLineaChart {
  private showSurfaceHoarSeries: boolean;
  private forecastOption: ForecastOption | undefined;

  private withFreshPlugins(opts: uPlot.Options, name: string): uPlot.Options {
    return {
      ...opts,
      plugins: [
        TouchZoom.touchZoomPlugin(),
        new MeasurementDatesPlugin(this.measurementSelection).plugin(),
        profilerPlugin(name),
        ...(this.forecastOption
          ? [LineaOptsHelper.forecastInformationPlugin(this.forecastOption)]
          : []),
      ],
    };
  }

  constructor(
    result: StationData,
    showTitle: boolean,
    showSurfaceHoarSeries: boolean,
    backgroundColor: string,
    forecastOption: ForecastOption | undefined,
    measurementSelection: MeasurementSelection,
  ) {
    super(backgroundColor, showTitle, result, measurementSelection);
    this.showSurfaceHoarSeries = showSurfaceHoarSeries;
    this.forecastOption = forecastOption;
    this.createPlots().catch((e) => console.error(e));
  }

  setData(data: StationData) {
    const { timestamps, values, forecast } = data;
    let i = 0;
    const forecastValues = forecast?.values;
    /** p90 and p10 of the band, in the order of the edge series added in addForecastBand */
    const band = (key: ParameterType) =>
      forecast?.p10?.[key] && forecast.p90?.[key] ? [forecast.p90[key], forecast.p10[key]] : [];

    if (values.HS || values.PSUM) {
      const measuredPsumAccum = values.PSUM
        ? this.#sumupPrecipitation(timestamps, values.PSUM)
        : undefined;
      // without measured precipitation, the forecast is accumulated from zero
      const forecastPsumAccum = forecastValues?.PSUM
        ? this.#sumupForecastPrecipitation(timestamps, forecastValues.PSUM, measuredPsumAccum ?? [])
        : undefined;

      // same order as the series added in createPlots and addForecastSeries
      this.updateData(this.plots[i], [
        timestamps,
        ...(values.HS ? [values.HS] : []),
        ...(measuredPsumAccum ? [measuredPsumAccum] : []),
        ...(forecastValues?.HS ? [forecastValues.HS] : []),
        ...(forecastPsumAccum ? [forecastPsumAccum] : []),
        ...band("HS"),
      ]);
      i += 1;
    }
    if (values.VW || values.VW_MAX || values.DW) {
      this.updateData(
        this.plots[i],
        [timestamps, values.VW, values.VW_MAX, this.#filterDWData(values.DW)].concat(
          forecastValues
            ? [
                forecastValues.VW,
                forecastValues.VW_MAX,
                this.#filterDWData(forecastValues.DW),
                ...band("VW"),
              ]
            : [],
        ),
      );
      i += 1;
    }
    if (values.TA || values.TD || values.TSS) {
      const forecastTd = this.#calculateDewPointSeries(forecastValues?.TA, forecastValues?.RH);
      const TD = values.TD ?? this.#calculateDewPointSeries(values.TA, values.RH);
      this.updateData(
        this.plots[i],
        [
          timestamps,
          TD,
          values.TSS,
          ...(this.showSurfaceHoarSeries && values.TSS ? [data.generateSurfaceHoarData(TD)] : []),
          values.TA,
        ].concat(
          forecastTd ? [forecastTd] : [],
          forecastValues?.TA ? [forecastValues.TA] : [],
          band("TA"),
        ),
      );
      i += 1;
    }
    if (values.RH || values.ISWR) {
      this.updateData(
        this.plots[i],
        [timestamps, values.RH, values.ISWR].concat(
          forecastValues ? [forecastValues.RH, forecastValues.ISWR, ...band("RH")] : [],
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
        this.withFreshPlugins(
          {
            ...opts_HS_PSUM.opts_HS_PSUM,
            ...this.getStationTitle(),
          },
          "HS_PSUM",
        ),
        [this.result.timestamps],
        plot_HS_PSUM,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p);
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
        this.withFreshPlugins(
          {
            ...opts_VW_VWG_DW.opts_VW_VWG_DW,
            ...this.getStationTitle(),
          },
          "VW_VWG_DW",
        ),
        [this.result.timestamps],
        plot_VW_VWG_DW,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p);
      this.plotnames.push(i18n.message("linea:plotnames:wind"));
      this.addSeries(p, opts_VW_VWG_DW.VW.series, this.result.values.VW);
      this.addSeries(p, opts_VW_VWG_DW.opts_VW_MAX, this.result.values.VW_MAX);
      this.addSeries(p, opts_VW_VWG_DW.DW.series, this.#filterDWData(this.result.values.DW));
      // Forecast series will be added after forecast data is loaded
    }

    if (this.result.values.TA || this.result.values.TD || this.result.values.TSS) {
      const TD =
        this.result.values.TD ??
        this.#calculateDewPointSeries(this.result.values.TA, this.result.values.RH);
      const p = new uPlot(
        this.withFreshPlugins(
          {
            ...opts_TA_TD_TSS.opts_TA_TD_TSS,
            ...this.getStationTitle(),
          },
          "TA_TD_TSS",
        ),
        [this.result.timestamps],
        plot_TA_TD_TSS,
      );
      this.drawedTitle = true;

      this.modifyDrawHook(p);
      this.plotnames.push(i18n.message("linea:plotnames:temperature"));
      this.addSeries(p, opts_TA_TD_TSS.TD.series, TD);

      // show snow surface temperature and therefore surface hoar only if available
      if (this.result.values.TSS) {
        this.addSeries(p, opts_TA_TD_TSS.TSS.series, this.result.values.TSS);
        if (this.showSurfaceHoarSeries) {
          const surfacehoar = this.result.generateSurfaceHoarData(TD);
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
        this.withFreshPlugins(
          {
            ...opts_RH_GR.opts_RH_GR,
            ...this.getStationTitle(),
          },
          "RH_GR",
        ),
        [this.result.timestamps],
        plot_RH_GR,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p);
      this.plotnames.push(i18n.message("linea:plotnames:humidity_gr"));
      this.addSeries(p, opts_RH_GR.RH.series, this.result.values.RH);
      this.addSeries(p, opts_RH_GR.ISWR.series, this.result.values.ISWR);
      // Forecast series will be added after forecast data is loaded
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  #filterDWData(values: Series | undefined): (number | null)[] {
    if (!values) {
      return [];
    }
    let density = Math.ceil(values.length / 7500);
    return Array.from(values, (o, i) => (i % density == 0 ? o : null));
  }

  /**
   * Sums the precipitation until it reaches 7 o'clock, then resets to zero and starts all over.
   *
   * Handles missing data inside the precipitation data by treating them as zero.
   */
  #sumupPrecipitation(timestamps: number[], psum: Series): number[] {
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
        sum = Number.isNaN(psum[i]) ? 0 : psum[i];
        result[i] = sum;
      } else {
        lastWasBefore7 = date.hour < 7;
        sum += Number.isNaN(psum[i]) ? 0 : psum[i];
        result[i] = sum;
      }
    }
    return result;
  }

  #sumupForecastPrecipitation(
    timestamps: number[],
    forecastPsum: Series,
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
      if (value !== undefined && !Number.isNaN(value)) {
        return value;
      }
    }
    return 0;
  }

  #calculateDewPointSeries(
    temperature: Series | undefined,
    humidity: Series | undefined,
  ): Series | undefined {
    if (!temperature || !humidity) {
      return undefined;
    }
    return seriesOf(temperature.length, (i) => dewPoint(temperature[i], humidity[i]) ?? NaN);
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
    if (!this.forecastOption?.latlong || !this.result.forecast) {
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
      this.#addForecastBand(plot, opts_HS_PSUM.HS, "HS");
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
      this.#addForecastBand(plot, opts_VW_VWG_DW.VW, "VW");
      plotIdx += 1;
    }

    // TA/TD/TSS plot
    if (this.result.values.TA || this.result.values.TD || this.result.values.TSS) {
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
      this.#addForecastBand(plot, opts_TA_TD_TSS.TA, "TA");
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
      this.#addForecastBand(plot, opts_RH_GR.RH, "RH");
    }
  }

  /**
   * Adds the shaded band between the 10th and 90th forecast percentile of `key`, if available:
   * the p90 and p10 edge series (same order as in {@link setData}) and the band between them.
   */
  #addForecastBand(plot: uPlot, parameter: LineaChartParameter, key: ParameterType): void {
    const p10 = this.result.forecast?.p10?.[key];
    const p90 = this.result.forecast?.p90?.[key];
    const band = parameter.forecastBand;
    if (!band || !p10 || !p90) {
      return;
    }
    this.addSeries(plot, band.upper, p90);
    this.addSeries(plot, band.lower, p10);
    const upperIdx = plot.series.length - 2;
    plot.addBand({ series: [upperIdx, upperIdx + 1], fill: () => band.fill });
    this.#showForecastBandInLegend(plot, [upperIdx, upperIdx + 1]);
  }

  /**
   * Shows the legend rows of the band edges only while the cursor is on a forecasted value
   * of a visible band, so that the measured period is not cluttered with empty 10 % / 90 % rows.
   */
  #showForecastBandInLegend(plot: uPlot, edgeIdxs: number[]): void {
    const update = (u: uPlot) => {
      const rows = u.root.querySelectorAll<HTMLElement>(".u-legend .u-series");
      for (const seriesIdx of edgeIdxs) {
        const series = u.series[seriesIdx];
        const idx = u.cursor.idx;
        const value = idx == null ? null : u.data[seriesIdx]?.[idx];
        const visible = !!series.show && value != null && !Number.isNaN(value);
        rows.forEach((row) => {
          if (row.querySelector(".u-label")?.textContent?.trim() === series.label) {
            row.style.display = visible ? "" : "none";
          }
        });
      }
    };
    plot.hooks.setLegend = [...(plot.hooks.setLegend ?? []), update];
    update(plot);
  }
}

customElements.define("linea-chart", LineaChart);
