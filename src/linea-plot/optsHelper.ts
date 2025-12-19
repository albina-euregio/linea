import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";

export class OptsHelper {
  static UpdateAxisLabels(
    ctx: CanvasRenderingContext2D,
    labely1: string,
    labely2: string,
    boxLeft: number,
    boxwidth: number,
    canvasHeight: number,
    fillStyle1: string | CanvasGradient | CanvasPattern,
    fillStyle2: string | CanvasGradient | CanvasPattern,
  ): CanvasRenderingContext2D {
    const labelOffset = labely1.length * 3; // additional offset for label position
    const xPosY = boxLeft + labelOffset;
    const yPos = canvasHeight * 0.05;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = fillStyle1;
    ctx.fillText(labely1, xPosY, yPos);
    ctx.restore();
    const width1 = ctx.measureText(labely1).width;
    const endX1 = xPosY + width1 / 2;

    if (labely2 == "") {
      return ctx;
    }
    // Right Y-axis label
    const label2Offset = labely2.length * 3; // additional offset for label position
    const xPosY2 = boxLeft + boxwidth - label2Offset;
    let minFontSize = ctx.font ? parseInt(ctx.font.split(" ")[0]) : 12;
    const width2 = ctx.measureText(labely2).width;
    const startx2 = xPosY2 - width2 / 2;
    if (endX1 < startx2) {
      // check if overlapping text
      minFontSize = 0; //don't adjust for large screens
    }
    const yPos2 = yPos + minFontSize; //*3;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = fillStyle2;
    ctx.fillText(labely2, xPosY2, yPos2);
    ctx.restore();
    return ctx;
  }

  static getLineaOptions(): uPlot.Options {
    return {
      ms: 1, // timestamp multiplier that yields 1 millisecond
      width: 1040,
      height: 300,
      padding: [50, 50, 0, 50],
      cursor: cursorOpts,
      legend: {
        show: true,
        live: true,
        fill: (u: any, seriesIdx: number) => u.series[seriesIdx].stroke(u, seriesIdx),
        markers: {
          fill: (u: any, seriesIdx: number) =>
            u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
          values: (u: any, seriesIdx: number, values: any) => {
            let result: any = {};
            u.series.forEach((s: any, i: number) => {
              if (i === 0) {
                result[s.label || s.name] = values[i];
              } else {
                result[s.label] = values[i] + (s.unit ? ` ${s.unit}` : "");
              }
            });
            return result;
          },
        },
      }
    };
  }

  getTextWidth(text: string, fontSize: number, fontFamily: string = "sans-serif"): number {
    // Create a canvas element (off-screen)
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return 0;
    }

    // Set the font style
    context.font = `${fontSize}px ${fontFamily}`;

    // Measure the text
    const metrics = context.measureText(text);
    return metrics.width;
  }
}
