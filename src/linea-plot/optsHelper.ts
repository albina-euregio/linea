import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";

export interface SplitOptions {
  uplot: uPlot;
  mins: number[];
  maxs: number[];
  splits: number[][];
  splitcount: number;
}

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
      padding: [50, 0, 0, -10],
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
      },
    };
  }

  static calculateAxisLimitsInZoom(u: uPlot, indices: number[]) {
    if (!u.data || u.data.length === 0 || u.select.width <= 0) {
      return false;
    }

    let min = u.posToVal(u.select.left, "x");
    let max = u.posToVal(u.select.left + u.select.width, "x");
    const startIdx = u.data[0].findIndex((v) => v >= min);
    const endIdx = u.data[0].findIndex((v) => v >= max);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return false;
    }

    const filteredData = indices.map((i) => u.data[i].slice(startIdx, endIdx + 1));
    const counts = filteredData.map((d) => {
      return d.filter((v) => u.scales.y.max <= v).length / d.length;
    });
    if (counts.some((c) => c > 0.33)) {
      const datamax = Math.max(...filteredData.map((d) => Math.max(...d)));
      const datamin = Math.min(...filteredData.map((d) => Math.min(...d)));
      console.log(datamin, datamax, Math.floor(datamin / 10) * 10, Math.ceil(datamax / 10) * 10);
      u.setScale("y", { min: Math.floor(datamin / 10) * 10, max: Math.ceil(datamax / 10) * 10 });
      u.redraw();
    }
  }

  static getSplits(splitopotions: SplitOptions): number[] {
    const { uplot, mins, maxs, splits } = splitopotions;

    const min = uplot.scales.y.min ?? 0;
    const max = uplot.scales.y.max ?? 0;

    for (let i = 0; i < maxs.length; i++) {
      if (min >= mins[i] && max <= maxs[i]) {
        return splits[i];
      }
    }

    const minSplit = Math.floor(min / 10) * 10;
    const maxSplit = Math.ceil(max / 10) * 10;
    const result: number[] = [];
    for (let v = minSplit; v <= maxSplit; v += 10) {
      result.push(v);
    }
    return result;
  }
}
