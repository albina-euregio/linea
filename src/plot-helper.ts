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
  //#region Private Methods

  //#endregion
}