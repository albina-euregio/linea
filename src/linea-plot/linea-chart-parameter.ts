import type uPlot from "uplot";
import type { SplitOptions } from "../shared/opts-helper.ts";

/** Adaptive split config (reuses {@link SplitOptions}, minus the runtime `uplot`). */
export type LineaSplitSpec = Omit<SplitOptions, "uplot">;

/**
 * Collects the uPlot options that define one plotted parameter: its scale,
 * its axis (incl. tick `values` formatting) and its series (incl. point
 * `value` formatting). Reuses uPlot's own types verbatim — no new vocabulary.
 *
 * The scale name is taken from `axis.scale` (which must equal `series.scale`).
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
  /** the data series: `label`, `stroke`, `width`, `fill`, point `value`. */
  series!: uPlot.Series;
  /** optional dashed forecast twin of `series`. */
  forecast?: uPlot.Series;
  /** axis label drawn at the top of the chart, incl. unit, e.g. `"HS (cm)"`. */
  label?: string;
  /** fill colour for {@link label} (typically the same as `axis.stroke`). */
  labelColor?: string;

  constructor(
    p: Pick<LineaChartParameter, "scale" | "axis" | "series" | "forecast" | "label" | "labelColor">,
  ) {
    Object.assign(this, p);
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
