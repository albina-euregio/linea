import uPlot from "uplot";
import { cursorOpts } from "../../shared/cursor-opts";
import { TouchZoom } from "../../shared/touch-zoom";
import { OptsHelper } from "../../shared/opts-helper";

export class AwsStatsOptsHelper extends OptsHelper {
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
      true,
    );
  }

  static getDefaultOptions(): uPlot.Options {
    return {
      ms: 1, // timestamp multiplier that yields 1 millisecond
      width: 1040,
      height: 300,
      padding: [20, 20, 0, 0],
      cursor: cursorOpts,
      plugins: [TouchZoom.touchZoomPlugin()],
      legend: {
        show: true,
        live: true,
        fill: (u: any, seriesIdx: number) => u.series[seriesIdx].stroke(u, seriesIdx),
        markers: {
          fill: (u: any, seriesIdx: number) =>
            u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
        },
      },
    };
  }
}
