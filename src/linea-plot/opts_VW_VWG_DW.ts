import type uPlot from "uplot";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for Windgeschwindigkeit [km/h] & Windrichtung [˚]
 */
export const opts_VW_VWG_DW: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        ctx.save();
        ctx.textBaseline = "top";

        const canvasHeight = u.ctx.canvas.height;
        var labely1 = `${i18n.message("dialog:weather-station-diagram:parameter:VW")} (km/h)`;
        var labely2 = i18n.message("dialog:weather-station-diagram:parameter:DW");
        var labelColor1 = "#00E2B6";
        var labelColor2 = "#084D40";
        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          canvasHeight,
          labelColor1,
          labelColor2,
        );

        // Draw reference line at 25 km/h (working group decision)
        const width = 1;
        const offset = (width % 2) / 2;
        const x0 = u.bbox.left;
        const y0 = u.valToPos(25, "y", true);
        const x1 = u.bbox.left + u.bbox.width;

        ctx.strokeStyle = "#000";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0 + offset, y0 + offset);
        ctx.lineTo(x1 + offset, y0 + offset);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      },
    ],
  },
  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        let validMax = dataMax;
        return validMax > 100 ? [0, 120] : [0, 100];
      },
    },
    y2: {
      range: [0, 360],
    },
  },
  axes: [
    timeAxis,
    {
      scale: "y",
      side: 3,
      stroke: "#00E2B6",
      grid: { show: true },
      splits: (u) => {
        const max = u.scales.y.max ?? 0;
        return max > 100 ? [0, 30, 60, 90, 120] : [0, 25, 50, 75, 100];
      },
      values: (u, vals) => vals.map((v) => v.toString()),
    },
    {
      splits: [0, 90, 180, 270, 360],
      stroke: "#084D40",
      values: ["N", "E", "S", "W", "N"],
      scale: "y2",
      side: 1,
      grid: {
        show: false,
      },
    },
  ],
  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_VW: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:VW"),
  stroke: "#00E2B6",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_VW_MAX: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:VW_MAX"),
  stroke: "#00A484",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_DW: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:DW"),
  stroke: "#084D40",
  paths: () => null,
  points: {
    space: 0,
    fill: "#084D40",
    size: 4,
  },
  scale: "y2",
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "°"),
};
