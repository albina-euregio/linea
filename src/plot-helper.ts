import uPlot from "uplot";

export class PlotHelper {
  static #m_style?: HTMLStyleElement;
  /**
   * this method calculates a scale factor based on the client width.
   * @param clientWidth 
   * @returns 
   */
  static GetScale(clientWidth: number): number {
    const baseWidth = 360;
    const minScale = 0.6;
    return Math.max(minScale, Math.min(1, clientWidth / baseWidth));
  }

  /**
   * resize all plots and adjust styles based on client width
   * @param plots 
   * @param clientWidth 
   * @param style 
   * @param controls 
   */
  static resizePlots(plots: uPlot[], clientWidth: number, style: CSSStyleDeclaration) {
   plots.forEach((p) =>
     p.setSize({
        width: clientWidth,
        height: p.height,
      }));
    // compute a scale factor based on element width so text shrinks on narrow layouts
    const baseWidth = 360; // width at which scale == 1
    const minScale = 0.6; // don't shrink below this
    const scale =  Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    //this.style.setProperty("--plot-scale", String(scale));
    style.fontSize =`${12 * scale}px`;
    style.padding =`${6 * scale}px ${10 * scale}px`;
    plots.forEach((p) =>
      p.setSize({
        width: clientWidth,
        height: p.height,
      })
    );
  }

  /**
   * adds a series to the specified plot and tracks the plot in the plots array if not already present.
   * @param plots 
   * @param plot 
   * @param series 
   * @param data 
   */
  static addSeries(plots: uPlot[], plot: uPlot, series: uPlot.Series, data: number[]) {
    if (!plots.includes(plot)) {
      plots.push(plot);
    }        
    if (!data) {
      console.warn("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    plot.addSeries({ ...series, show: !!data?.length });
    plot.data.push(data);
  }

  static GetStyle(document: Document, css: string): HTMLStyleElement{
    if (!this.#m_style) {
      return this.#CreateStyle(document, css);
    }
    return this.#m_style;
  }

  //#region Private Methods
  static #CreateStyle(document: Document, css: string): HTMLStyleElement {
    const style = document.createElement("style");
    style.textContent = css;
    style.textContent = `
      .vw-max-plot .u-axis-label {
        transform-origin: left top;
        white-space: nowrap;
      }

      .hs-year-plot .u-axis-label {
        transform-origin: left top;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
    this.#m_style = style;
    return style;
  }
  //#endregion
}