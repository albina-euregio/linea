import uPlot from "uplot";
import { TouchZoom } from "../shared/touch-zoom";
import { OptsHelper } from "../shared/opts-helper";
import { cursorOpts } from "../shared/cursor-opts";

// Create a single sync instance for all charts
const syncCursor = uPlot.sync("weather-charts");

export interface SplitOptions {
  uplot: uPlot;
  mins: number[];
  maxs: number[];
  splits: number[][];
  splitcount: number;
}

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

  static getLineaOptions(): uPlot.Options {
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
