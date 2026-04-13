import uPlot from "uplot";
import { OptsHelper } from "../shared/opts-helper";
import { cursorOpts } from "../shared/cursor-opts";
import { i18n } from "../i18n";

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

  static drawForecastInformation(u: uPlot) {
    const ctx = u.ctx;
    const width = 1;
    const offset = (width % 2) / 2;
    const now = new Date().getTime();
    const lastData = u.data[0][u.data[0].length - 1];
    if (lastData != null && lastData > now) {
      const forecastX = u.valToPos(now, "x", true);
      ctx.strokeStyle = "#00000056";
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(forecastX + offset, u.bbox.top);
      ctx.lineTo(forecastX + offset, u.bbox.top + u.bbox.height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#00000056";
      ctx.fillText(i18n.message("linea:forecast:arome"), forecastX + 5, u.bbox.top - 10);
    }
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
