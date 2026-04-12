import uPlot from "uplot";
import type { ForecastValues, StationData, Values } from "./data/station-data";
export abstract class AbstractLineaChart extends HTMLElement {
  plots: uPlot[] = [];
  plotnames: string[] = [];
  resizeObserver = new ResizeObserver(() => this.resizePlots(this.clientWidth, this.style));

  protected drawedTitle: boolean = false;
  protected backgroundColor: string;
  protected showTitle: boolean;
  public result: StationData;

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
      data.push(element ?? this.#createNullArray());
    }
    plot.setData(data);
    this.#syncForecastSeriesVisibility(plot);
  }

  #syncForecastSeriesVisibility(plot: uPlot) {
    const data = plot.data as [xValues: number[], ...yValues: (number | null | undefined)[][]];
    for (let seriesIdx = 1; seriesIdx < plot.series.length; seriesIdx++) {
      const series = plot.series[seriesIdx];
      if (series.label !== "Forecast") {
        continue;
      }

      const values = data[seriesIdx] ?? [];
      const hasData = values.some((value) => value !== null && !Number.isNaN(value));
      if (hasData && !series.show) {
        plot.setSeries(seriesIdx, { show: true });
      }
    }
  }

  #createNullArray() {
    let nulls: number | null[] = [];
    this.result.timestamps.forEach(() => nulls.push(null));
    return nulls;
  }

  addSeries(plot: uPlot, series: uPlot.Series, data: (number | null)[]) {
    if (!this.plots.includes(plot)) {
      this.plots.push(plot);
    }
    if (!data) {
      console.debug("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    plot.addSeries({ ...series, show: !!data?.length });
    (plot.data as [xValues: number[], ...yValues: (number | null | undefined)[][]]).push(data);
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
