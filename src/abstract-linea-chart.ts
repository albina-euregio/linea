import uPlot from "uplot";
import type { ForecastValues, StationData, Values } from "./data/station-data";
import { OptsHelper } from "./shared/opts-helper";
export abstract class AbstractLineaChart extends HTMLElement {
  plots: uPlot[] = [];
  plotnames: string[] = [];
  resizeObserver = new ResizeObserver(() => this.resizePlots(this.clientWidth, this.style));

  private forecastSeriesHooks = new WeakSet<uPlot>();
  protected drawedTitle: boolean = false;
  protected backgroundColor: string;
  protected showTitle: boolean;
  public result: StationData;
  private forecastCursorValueSync = new WeakMap<uPlot, Set<number>>();

  constructor(backgroundColor: string, showTitle: boolean, result: StationData) {
    super();
    this.backgroundColor = backgroundColor;
    this.showTitle = showTitle;
    this.result = result;
  }

  connectedCallback() {
    this.resizeObserver.observe(this);
    this.resizePlots(this.clientWidth, this.style);
  }

  disconnectedCallback() {
    this.resizeObserver.unobserve(this);
  }

  abstract setData(timestamps: number[], values: Values, forecast?: ForecastValues): void;

  protected abstract getStationTitle(): {};

  resizePlots(clientWidth: number, style: CSSStyleDeclaration, heightPerCanvas: number = NaN) {
    this.plots.forEach((p) =>
      p.setSize({
        width: clientWidth,
        height: Number.isNaN(heightPerCanvas) ? p.height : heightPerCanvas,
      }),
    );
    // compute a scale factor based on element width so text shrinks on narrow layouts
    const baseWidth = 360; // width at which scale == 1
    const minScale = 0.6; // don't shrink below this
    const scale = Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    //this.style.setProperty("--plot-scale", String(scale));
    if (style) {
      style.fontSize = `${12 * scale}px`;
      style.padding = `${6 * scale}px ${10 * scale}px`;
    }
  }

  protected updateData(plot: uPlot, values: (number | null)[][]) {
    let data = [] as unknown as [xValues: number[], ...yValues: (number | null | undefined)[][]];
    for (const element of values) {
      data.push(this.#normalizePlotSeriesData(element ?? this.#createNullArray()));
    }
    plot.setData(data);
    this.#syncForecastSeriesVisibility(plot);
  }

  #syncForecastSeriesVisibility(plot: uPlot) {
    if (this.forecastSeriesHooks.has(plot)) {
      return;
    }

    this.forecastSeriesHooks.add(plot);
    plot.hooks.setSeries = plot.hooks.setSeries || [];
    plot.hooks.setSeries.push((u) => {
      try {
        for (let seriesIdx = 1; seriesIdx < u.series.length; seriesIdx++) {
          const series = u.series[seriesIdx];
          if (series.label !== "Forecast") {
            continue;
          }

          const baseSeriesIdx = this.#findBaseSeriesForForecast(u, seriesIdx);
          const baseSeriesVisible = baseSeriesIdx > 0 ? !!u.series[baseSeriesIdx].show : false;
          const forecastValues = (u.data[seriesIdx] ?? []) as (number | null | undefined)[];
          const hasData = forecastValues.some((value) => value != null && !Number.isNaN(value));
          const shouldShow = hasData && baseSeriesVisible;

          if (series.show !== shouldShow) {
            u.setSeries(seriesIdx, { show: shouldShow });
          }
        }
      } finally {
        this.#hideForecastLegendRows(u);
      }
    });
    this.#hideForecastLegendRows(plot);
  }

  #findBaseSeriesForForecast(plot: uPlot, forecastSeriesIdx: number): number {
    const forecastColor = OptsHelper.resolveSeriesStroke(plot, forecastSeriesIdx);

    for (let idx = forecastSeriesIdx - 1; idx >= 1; idx--) {
      const candidate = plot.series[idx];
      if (candidate.label === "Forecast") {
        continue;
      }

      if (OptsHelper.resolveSeriesStroke(plot, idx) === forecastColor) {
        return idx;
      }
    }

    return -1;
  }

  #hideForecastLegendRows(plot: uPlot) {
    const rows = plot.root.querySelectorAll<HTMLElement>(".u-legend .u-series");
    rows.forEach((row) => {
      const label = row.querySelector<HTMLElement>(".u-label")?.textContent?.trim();
      if (label?.startsWith("Forecast")) {
        row.style.display = "none";
      }
    });
  }

  #syncBaseSeriesCursorValue(plot: uPlot, baseSeriesIdx: number, forecastSeriesIdx: number): void {
    if (baseSeriesIdx < 1 || forecastSeriesIdx < 1) {
      return;
    }

    if (!this.forecastCursorValueSync.has(plot)) {
      this.forecastCursorValueSync.set(plot, new Set<number>());
    }

    const syncedSeries = this.forecastCursorValueSync.get(plot)!;
    if (syncedSeries.has(baseSeriesIdx)) {
      return;
    }

    const originalValue = plot.series[baseSeriesIdx].value;
    plot.series[baseSeriesIdx].value = (u, v, seriesIdx, dataIdx) => {
      const measured = typeof v === "number" && !Number.isNaN(v) ? v : null;
      const forecast =
        typeof dataIdx === "number"
          ? ((u.data[forecastSeriesIdx]?.[dataIdx] as number | null | undefined) ?? null)
          : null;
      const merged = measured ?? forecast;

      if (typeof originalValue === "function") {
        return originalValue(u, merged, seriesIdx, dataIdx);
      }

      return merged == null ? "-" : `${merged}`;
    };

    syncedSeries.add(baseSeriesIdx);
  }

  #createNullArray() {
    let nulls: number | null[] = [];
    this.result.timestamps.forEach(() => nulls.push(null));
    return nulls;
  }

  #normalizePlotSeriesData(series: (number | null | undefined)[]): (number | null | undefined)[] {
    return series.map((value) => {
      if (typeof value === "number" && Number.isNaN(value)) {
        return null;
      }
      return value;
    });
  }

  addSeries(plot: uPlot, series: uPlot.Series, data: (number | null)[]) {
    if (!this.plots.includes(plot)) {
      this.plots.push(plot);
    }
    if (!data) {
      console.debug("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    const isForecastSeries = series.label === "Forecast";
    plot.addSeries({ ...series, show: isForecastSeries ? true : !!data?.length });
    (plot.data as [xValues: number[], ...yValues: (number | null | undefined)[][]]).push(
      this.#normalizePlotSeriesData(data),
    );

    if (isForecastSeries) {
      const forecastSeriesIdx = plot.series.length - 1;
      const baseSeriesIdx = this.#findBaseSeriesForForecast(plot, forecastSeriesIdx);
      this.#syncBaseSeriesCursorValue(plot, baseSeriesIdx, forecastSeriesIdx);
    }

    this.#syncForecastSeriesVisibility(plot);
    this.#hideForecastLegendRows(plot);
  }

  modifyDrawHook(p: uPlot, backgroundColor: string) {
    p.hooks.draw = p.hooks.draw || [];
    p.hooks.draw.unshift((u) => {
      const { left, top, width, height } = u.bbox;
      const ctx = u.ctx;
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    });
  }

  setBackgroundColor(color: string) {
    this.backgroundColor = color;
    this.plots.forEach((p) => p.redraw());
  }

  getBackgroundColor(): string {
    return this.backgroundColor;
  }
}
