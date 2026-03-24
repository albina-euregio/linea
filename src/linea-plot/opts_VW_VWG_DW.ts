import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper, type SplitOptions } from "./linea-opts-helper";

/**
 * uPlot options for Windgeschwindigkeit [km/h] & Windrichtung [˚]
 */
export const opts_VW_VWG_DW: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        var labely1 = `${i18n.message("linea:parameter:VW")} (km/h)`;
        var labely2 = i18n.message("linea:parameter:DW");
        var labelColor1 = "#00E2B6";
        var labelColor2 = "#084D40";
        LineaOptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
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
    setSelect: [
      (u) => {
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1, 2]);
      },
    ],
  },
  scales: {
    x: timeScale,
    y: {
      range: (_u, _dataMin, dataMax) => {
        const closest = [100, 120, 160, 230, 300].reduce((prev, curr) =>
          dataMax > prev && dataMax <= curr ? curr : prev,
        );
        return [0, closest];
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
        return LineaOptsHelper.getSplits({
          uplot: u,
          mins: [0, 0, 0, 0, 0],
          maxs: [100, 120, 160, 230, 300],
          splits: [
            [0, 25, 50, 75, 100],
            [0, 30, 60, 90, 120],
            [0, 40, 80, 120, 160],
            [0, 60, 120, 180, 230],
            [0, 75, 150, 225, 300],
          ],
          splitcount: 5,
        } as SplitOptions);
      },
      values: (_, vals) => vals.map((v) => v.toString()),
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
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_VW: uPlot.Series = {
  label: i18n.message("linea:parameter:VW"),
  stroke: "#00E2B6",
  scale: "y",
  width: 1.5,
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_VW_MAX: uPlot.Series = {
  label: i18n.message("linea:parameter:VW_MAX"),
  stroke: "#00A484",
  scale: "y",
  width: 1.5,
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_DW: uPlot.Series = {
  label: i18n.message("linea:parameter:DW"),
  stroke: "#084D40",
  paths: () => null,
  points: {
    space: 0,
    fill: "#084D40",
    size: 4,
  },
  scale: "y2",
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "°"),
};
