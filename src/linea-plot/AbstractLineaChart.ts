import uPlot from "uplot";
import { Result, Values } from "../data/station-data";
export abstract class AbstractLineaChart extends HTMLElement {
  plots: uPlot[] = [];
  plotnames: string[] = [];
  resizeObserver = new ResizeObserver(() => this.resizePlots(this.clientWidth, this.style));

  protected drawedTitle: boolean = false;

  constructor(
    protected backgroundColor: string,
    protected showTitle: boolean,
    public result: Result,
  ) {
    super();
  }

  abstract setData(timestamps: number[], values: Values);

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

  protected updateData(plot: uPlot, values: (number | null)[][], appendTimestamps: boolean = true) {
    let data = [];
    if (appendTimestamps) {
      data.push(this.result.timestamps);
    }
    for (const element of values) {
      data.push(element ?? this.#createNullArray());
    }
    plot.setData(data);
  }

  #createNullArray() {
    let nulls: number | null[] = [];
    this.result.timestamps.forEach(() => nulls.push(null));
    return nulls;
  }

  addSeries(plot: uPlot, series: uPlot.Series, data: number[]) {
    if (!this.plots.includes(plot)) {
      this.plots.push(plot);
    }
    if (!data) {
      console.debug("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    plot.addSeries({ ...series, show: !!data?.length });
    plot.data.push(data);
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
