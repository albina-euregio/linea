import uPlot from "uplot";

export interface SplitOptions {
  uplot: uPlot;
  mins: number[];
  maxs: number[];
  splits: number[][];
  splitcount: number;
}

export class OptsHelper {
  static UpdateAxisLabels(
    u: uPlot,
    leftLabel: string,
    rightLabel: string,
    chartLeft: number,
    chartWidth: number,
    leftFillStyle: string | CanvasGradient | CanvasPattern,
    rightFillStyle: string | CanvasGradient | CanvasPattern,
    hideAxes: boolean = false,
  ): CanvasRenderingContext2D {
    if (hideAxes) {
      const seriesShown: Map<string, boolean> = new Map();

      for (let i = 1; i < u.series.length; i++) {
        const label: string = u.series[i].scale as string;
        seriesShown.set(label, seriesShown.get(label) || (u.series[i].show as boolean));
      }

      for (let i = 1; i < u.axes.length; i++) {
        const scale: string = u.axes[i].scale as string;
        if (seriesShown.get(scale) === false) {
          if (u.axes[i].side === 3) {
            leftLabel = "";
          } else if (u.axes[i].side === 1) {
            rightLabel = "";
          }
        }
      }
    }
    const ctx = u.ctx;
    ctx.save();
    ctx.textBaseline = "top";

    const yPosition = 3;

    // Left Y-axis label
    const leftLabelOffset = ctx.measureText(leftLabel).width / 2 - 10;
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
    const rightLabelOffset = ctx.measureText(rightLabel).width / 2 - 10;
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

    const filteredData = indices.map((i) =>
      u.data[i] ? u.data[i].slice(startIdx, endIdx + 1) : [],
    );
    const counts = filteredData.map((d) => {
      d = d.filter((v) => !Number.isNaN(v));
      return d.length == 0
        ? 1
        : d.filter((v) => u.scales.y.min < v && v <= u.scales.y.max).length / d.length;
    });
    if (counts.some((c) => c < 0.66)) {
      let datamax = Math.max(...filteredData.map((d) => Math.max(...d)));
      let datamin = Math.min(...filteredData.map((d) => Math.min(...d)));
      if (Number.isNaN(datamin)) {
        datamin = u.scales.y.min;
      }
      if (Number.isNaN(datamax)) {
        datamax = u.scales.y.max;
      }
      u.setScale("y", { min: Math.floor(datamin / 10) * 10, max: Math.ceil(datamax / 10) * 10 });
      u.redraw();
    }
  }

  static getSplits(splitopotions: SplitOptions, axes: string = "y"): number[] {
    const { uplot, mins, maxs, splits } = splitopotions;

    const min = uplot.scales[axes].min ?? 0;
    const max = uplot.scales[axes].max ?? 0;

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
