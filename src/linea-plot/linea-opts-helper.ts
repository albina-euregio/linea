import uPlot from "uplot";
import { OptsHelper } from "../shared/opts-helper";
import { cursorOpts } from "../shared/cursor-opts";
import type { LineaChartParameter } from "./linea-chart-parameter";
import type { ForecastOption } from "./forecast-option";

// Create a single sync instance for all charts
const syncCursor = uPlot.sync("weather-charts");

export class LineaOptsHelper extends OptsHelper {
  static UpdateAxisLabels(
    u: uPlot,
    leftLabel: string,
    rightLabel: string,
    chartLeft: number,
    chartWidth: number,
    leftFillStyle: string | CanvasGradient | CanvasPattern,
    rightFillStyle: string | CanvasGradient | CanvasPattern,
  ): CanvasRenderingContext2D {
    return super.UpdateAxisLabels(
      u,
      leftLabel,
      rightLabel,
      chartLeft,
      chartWidth,
      leftFillStyle,
      rightFillStyle,
      false,
    );
  }

  /** Draw the top axis labels for a chart; `right` is optional for single-axis charts. */
  static UpdateAxisLabelsForParameters(
    u: uPlot,
    left: LineaChartParameter,
    right?: LineaChartParameter,
  ): CanvasRenderingContext2D {
    return this.UpdateAxisLabels(
      u,
      left.label ?? "",
      right?.label ?? "",
      u.bbox.left,
      u.bbox.width,
      left.labelColor ? this.legibleColor(u, left.labelColor) : this.textColor(u),
      right?.labelColor ? this.legibleColor(u, right.labelColor) : "",
    );
  }

  static drawReferenceLine(
    u: uPlot,
    yValue: number,
    color = this.textColor(u),
    dash: number[] = [5, 5],
  ) {
    const width = 1;
    const offset = (width % 2) / 2;
    const x0 = u.bbox.left;
    const y0 = u.valToPos(yValue, "y", true);
    const x1 = u.bbox.left + u.bbox.width;
    const ctx = u.ctx;
    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0 + offset, y0 + offset);
    ctx.lineTo(x1 + offset, y0 + offset);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** Marks the start of the forecast in a chart, see {@link drawForecastInformation}. */
  static forecastInformationPlugin(forecastOptions: ForecastOption): uPlot.Plugin {
    return { hooks: { drawAxes: (u) => this.drawForecastInformation(u, forecastOptions) } };
  }

  static drawForecastInformation(u: uPlot, forecastOptions: ForecastOption) {
    const ctx = u.ctx;
    const width = 1;
    const offset = (width % 2) / 2;
    const t0 = (forecastOptions.model.t0 ?? new Date()).getTime();
    const lastData = u.data[0][u.data[0].length - 1];
    if (lastData != null && lastData > t0) {
      const forecastX = u.valToPos(t0, "x", true);
      ctx.save();
      ctx.strokeStyle = this.textColor(u);
      ctx.globalAlpha = 0.34;
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(forecastX + offset, u.bbox.top);
      ctx.lineTo(forecastX + offset, u.bbox.top + u.bbox.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = this.textColor(u);
      ctx.globalAlpha = 0.15;
      ctx.textBaseline = "top";
      const { label, labelOffset } = forecastOptions.model;
      const { upper, lower } = label;
      const labelX = forecastX + (5 + (labelOffset?.x ?? 0)) * uPlot.pxRatio;
      const labelY = u.bbox.top + (labelOffset?.y ?? 0) * uPlot.pxRatio;
      const lineOffset = 10 * uPlot.pxRatio;
      ctx.fillText(upper, labelX, labelY - (lower ? lineOffset : 0));
      if (lower) {
        ctx.fillText(lower, labelX, labelY + lineOffset);
      }
      ctx.restore();
    }
  }

  /**
   * Bridges nodata gaps caused by a parameter being sampled less often than the SMET raster
   * (e.g. TA every 10 min in a 5-min file), but keeps real outages as a break. uPlot measures
   * a gap from the last value before it to the first after, so an expected gap is exactly as
   * wide as the series' own sampling interval; wider than 1.5x means readings are missing.
   */
  static spanSamplingIntervalGaps(): uPlot.Series.GapsRefiner {
    return (u, seriesIdx, idx0, idx1, nullGaps) => {
      const xs = u.data[0];
      const ys = u.data[seriesIdx];
      let nativeStep = Infinity;
      let lastRealIdx = -1;
      for (let i = idx0; i <= idx1; i++) {
        if (ys[i] == null) continue;
        if (lastRealIdx >= 0) {
          const step = xs[i]! - xs[lastRealIdx]!;
          if (step > 0 && step < nativeStep) nativeStep = step;
        }
        lastRealIdx = i;
      }
      if (!Number.isFinite(nativeStep)) return nullGaps;

      const x0 = xs[idx0]!;
      const maxSpannablePx =
        u.valToPos(x0 + nativeStep * 1.5, "x", true) - u.valToPos(x0, "x", true);

      return nullGaps.filter((gap) => gap[1] - gap[0] > maxSpannablePx);
    };
  }

  static getLineaOptions(): Omit<uPlot.Options, "series"> {
    return {
      ms: 1, // timestamp multiplier that yields 1 millisecond
      width: 1040,
      height: 200,
      padding: [20, 3, 0, -10],
      cursor: {
        ...cursorOpts,
        sync: {
          key: syncCursor.key,
          setSeries: false,
          match: [(own, ext) => own == ext, (own, ext) => own == ext],
        },
      },
      legend: {
        show: true,
        live: true,
        markers: {
          fill: (u: any, seriesIdx: number) =>
            u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
        },
      },
    };
  }
}
