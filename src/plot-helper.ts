export class PlotHelper {
  #m_style?: HTMLStyleElement;
  /**
   * this method creates axes configuration for uPlot based on the given scale.
   * @param scale 
   * @returns 
   */  
  makeAxes(scale: number) {
    const baseAxisSize = 50;
    const axisSize = baseAxisSize * scale;
    const smallAxisSize = 5 * scale;
    const fontSize = Math.min(28 * scale, 12);
    return [
      {
        side: 2, // bottom x-axis
        size: axisSize,
        font: `${fontSize}px sans-serif`,
      },
      {
        side: 3, // left y-axis
        size: smallAxisSize,
        font: `${fontSize}px sans-serif`,
                draw: (
          u: uPlot,
          vals: number[],
          axisIdx: number,
          rect: uPlot.BBox,
        ) => {
          const ctx = u.ctx;
          ctx.save();
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.translate(rect.left - 30, rect.top + rect.height / 2);
 
          ctx.rotate(-Math.PI / 2);
          const axis = u.axes[axisIdx];
          let labelText = "";
          if (typeof axis.label === "string") {
            labelText = axis.label;
          } else if (typeof axis.label === "function") {
            labelText = axis.label(u, axisIdx, 0, 0); // You may want to pass real values for foundIncr and foundSpace
          }
          ctx.fillText(labelText, 0, 0);
          ctx.restore();
        }
      },
      {
        side: 1, // right y-axis
        size: smallAxisSize,
        font: `${fontSize}px sans-serif`,
      }
    ];
  }

  /**
   * this method calculates a scale factor based on the client width.
   * @param clientWidth 
   * @returns 
   */
  GetScale(clientWidth: number): number {
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
  resizePlots(plots: uPlot[], clientWidth: number, style: CSSStyleDeclaration, controls: HTMLElement | null) {
   plots.forEach((p) =>
     p.setSize({
        width: clientWidth,
        height: p.height,
      })
    );
    // compute a scale factor based on element width so text shrinks on narrow layouts
    const baseWidth = 360; // width at which scale == 1
    const minScale = 0.6; // don't shrink below this
    const scale =  Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    //this.style.setProperty("--plot-scale", String(scale));
    style.fontSize =`${12 * scale}px`;
    style.padding =`${6 * scale}px ${10 * scale}px`;
    if (controls) {
     const btns = controls.querySelectorAll<HTMLButtonElement>(".toggle-btn");
     btns.forEach((b) => {
       b.style.fontSize = `${12 * scale}px`;
       b.style.padding = `${6 * scale}px ${10 * scale}px`;
     });
   }
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
  addSeries(plots: uPlot[], plot: uPlot, series: uPlot.Series, data: Float32Array) {
      if (!plots.includes(plot)) {
        plots.push(plot);
      }
      plot.addSeries({ ...series, show: !!data?.length });
      plot.data.push(data ?? []);
    }

    GetStyle(document: Document, css: string): HTMLStyleElement{
      if (!this.#m_style) {
        return this.#CreateStyle(document, css);
      }
      return this.#m_style;
    }
  //#region Private Methods
    #CreateStyle(document: Document, css: string): HTMLStyleElement {
    //const s = document.getElementsByTagName("style");
    const style = document.createElement("style");
    style.textContent = css;
    style.textContent = `
      .vw-max-plot .u-axis-label {
        transform: rotate(-90deg);
        transform-origin: left top;
        white-space: nowrap;
      }

      .hs-year-plot .u-axis-label {
        transform: rotate(-90deg);
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