import uPlot from "uplot";
import { OptsHelper } from "../shared/opts-helper";
import { cursorOpts } from "../shared/cursor-opts";
import { i18n } from "../i18n";
import type { LineaChartParameter } from "./linea-chart-parameter";

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

  static drawForecastInformation(u: uPlot) {
    const ctx = u.ctx;
    const width = 1;
    const offset = (width % 2) / 2;
    const now = new Date().getTime();
    const lastData = u.data[0][u.data[0].length - 1];
    if (lastData != null && lastData > now) {
      const forecastX = u.valToPos(now, "x", true);
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

      const labelForecast = i18n.message("linea:forecast:arome");
      const indexOfG = labelForecast.indexOf("(G");
      const labelArome = labelForecast.slice(0, indexOfG);
      const labelGeosphere = labelForecast.slice(indexOfG);
      ctx.fillText(labelArome, forecastX + 5, u.bbox.top - 10);
      ctx.fillText(labelGeosphere, forecastX + 5, u.bbox.top + 10);
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
