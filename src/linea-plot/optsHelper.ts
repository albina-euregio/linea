import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { TouchZoom } from "./touchZoom";

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
    leftLabel: string,
    rightLabel: string,
    chartLeft: number,
    chartWidth: number,
    canvasHeight: number,
    leftFillStyle: string | CanvasGradient | CanvasPattern,
    rightFillStyle: string | CanvasGradient | CanvasPattern,
  ): CanvasRenderingContext2D {
    const yPosition = 3;

    // Left Y-axis label
    const leftLabelOffset = leftLabel.length * 3 - 10;
    const leftLabelX = chartLeft + leftLabelOffset;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = leftFillStyle;
    ctx.fillText(leftLabel, leftLabelX, yPosition);
    ctx.restore();

    const leftLabelWidth = ctx.measureText(leftLabel).width;
    const leftLabelEndX = leftLabelX + leftLabelWidth / 2;

    if (rightLabel === "") {
      return ctx;
    }

    // Right Y-axis label
    const rightLabelOffset = rightLabel.length * 3 - 10;
    const rightLabelX = chartLeft + chartWidth - rightLabelOffset;

    let fontSize = ctx.font ? parseInt(ctx.font, 10) : 12;

    const rightLabelWidth = ctx.measureText(rightLabel).width;
    const rightLabelStartX = rightLabelX - rightLabelWidth / 2;

    if (leftLabelEndX < rightLabelStartX) {
      fontSize = 0;
    }

    const rightLabelY = yPosition + fontSize;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = rightFillStyle;
    ctx.fillText(rightLabel, rightLabelX, rightLabelY);
    ctx.restore();

    return ctx;
  }

  static getLineaOptions(): uPlot.Options {
    return {
      ms: 1, // timestamp multiplier that yields 1 millisecond
      width: 1040,
      height: 200,
      padding: [20, 3, 0, -10],
      cursor: cursorOpts,
      plugins: [TouchZoom.touchZoomPlugin({})],
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
