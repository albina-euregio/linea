import uPlot from "uplot";
export abstract class AbstractLineaChart extends HTMLElement {
  plots: uPlot[] = [];
  resizeObserver = new ResizeObserver(() => this.resizePlots(this.clientWidth, this.style));

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
}
