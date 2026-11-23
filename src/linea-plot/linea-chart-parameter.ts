import type uPlot from "uplot";
import { OptsHelper, type SplitOptions } from "../shared/opts-helper";

/** Adaptive split config (reuses {@link SplitOptions}, minus the runtime `uplot`). */
export type LineaSplitSpec = Omit<SplitOptions, "uplot">;

/** labels of the edge series of a {@link LineaForecastBand}, shown in the legend while hovering the forecast */
export const FORECAST_BAND_LABELS = { upper: "90 %", lower: "10 %" } as const;

/** whether `label` is the label of an edge series of a {@link LineaForecastBand} */
export function isForecastBandLabel(label: uPlot.Series["label"]): boolean {
  return label === FORECAST_BAND_LABELS.upper || label === FORECAST_BAND_LABELS.lower;
}

/** a shaded band between two series, drawn with uPlot's `bands` */
export type LineaForecastBand = {
  /** edge series of the 90th percentile */
  upper: uPlot.Series;
  /** edge series of the 10th percentile */
  lower: uPlot.Series;
  fill: string;
};

/**
 * Collects the uPlot options that define one plotted parameter: its scale,
 * its axis (incl. tick `values` formatting) and its series (incl. point
 * `value` formatting). Reuses uPlot's own types verbatim — no new vocabulary.
 *
 * The scale name is taken from `axis.scale` (which must equal `series?.scale`).
 * The adaptive {@link splits} helper lives here so the `opts_*` modules no
 * longer reach into `LineaOptsHelper` for it. Chart-level helpers
 * (getLineaOptions, the drawAxes labels/forecast/reference-line, setSelect
 * zoom) stay in `LineaOptsHelper`. The exotic 10% can still tweak the
 * resulting objects.
 */
export class LineaChartParameter {
  /** the shared y-scale definition (`range`, …); keyed by `axis.scale`. */
  scale?: uPlot.Scale;
  /** the y-axis: `stroke`, `side`, `grid`, `splits`, tick `values`. */
  axis!: uPlot.Axis;
  /**
   * the primary data series: `label`, `stroke`, `width`, `fill`, point `value`.
   * Optional: a mirror axis or a multi-series scale may carry no single series.
   */
  series?: uPlot.Series;
  /** optional dashed forecast twin of `series`. */
  forecast?: uPlot.Series;
  /** optional shaded band between the 10th and 90th percentile of the {@link forecast}. */
  forecastBand?: LineaForecastBand;
  /** axis label drawn at the top of the chart, incl. unit, e.g. `"HS (cm)"`. */
  label?: string;
  /** fill colour for {@link label} (typically the same as `axis.stroke`). */
  labelColor?: string;

  constructor(
    p: Pick<
      LineaChartParameter,
      "scale" | "axis" | "series" | "forecast" | "forecastBand" | "label" | "labelColor"
    >,
  ) {
    Object.assign(this, p);
    const stroke = this.axis.stroke;
    if (typeof stroke === "string") {
      this.axis.stroke = (u) => OptsHelper.legibleColor(u, stroke);
    }
    this.axis.grid = { stroke: OptsHelper.gridColor, ...this.axis.grid };
    this.axis.ticks = { stroke: OptsHelper.gridColor, ...this.axis.ticks };
  }

  /**
   * The shaded forecast percentile band of `series`: its edges are invisible series in the colour
   * of `series` (so they follow its visibility, see `AbstractLineaChart`), the band is filled with `fill`.
   */
  static forecastBand(series: uPlot.Series, fill: string): LineaForecastBand {
    const edge = (label: string): uPlot.Series => ({
      ...series,
      label,
      width: 0,
      fill: undefined,
      dash: undefined,
      points: { show: false },
    });
    return {
      upper: edge(FORECAST_BAND_LABELS.upper),
      lower: edge(FORECAST_BAND_LABELS.lower),
      fill,
    };
  }

  /**
   * Adaptive tick `splits` for an `axis` (moved from `LineaOptsHelper.getSplits`):
   * pick the predefined split set whose `[min, max]` window contains the current
   * scale range, else fall back to a 10-step range.
   */
  static splits(scale: string, spec: LineaSplitSpec): uPlot.Axis["splits"] {
    return (u: uPlot) => {
      const { mins, maxs, splits } = spec;
      const min = u.scales[scale].min ?? 0;
      const max = u.scales[scale].max ?? 0;
      for (let i = 0; i < maxs.length; i++) {
        if (min >= mins[i] && max <= maxs[i]) return splits[i];
      }
      const result: number[] = [];
      for (let v = Math.floor(min / 10) * 10; v <= Math.ceil(max / 10) * 10; v += 10) {
        result.push(v);
      }
      return result;
    };
  }
}
