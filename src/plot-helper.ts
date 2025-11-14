export class PlotHelper {
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

  UpdatePlot(plot: uPlot) {
    //console.log("Plot options:", plot.opts);
    var axes = plot.axes;
    const series = plot.series;
    series.forEach((s, index) => {
      if (typeof s.scale === "string" && s.scale.includes("y")){
        console.log(`Series[${index}] uses 'y' scale with stroke color:`, s.label, s.stroke);
        console.log(s);
      }
    });
    
    //const options = plot.opts.axes;
    //plot.axes[0].size = options[0].size as number;
    //plot.axes[1].stroke = options[1].stroke as string;
  }


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

    addSeries(plots: uPlot[], plot: uPlot, series: uPlot.Series, data: Float32Array) {
      if (!plots.includes(plot)) {
        plots.push(plot);
      }
      plot.addSeries({ ...series, show: !!data?.length });
      plot.data.push(data ?? []);
    }
  //#region Private Methods

  //#endregion
}