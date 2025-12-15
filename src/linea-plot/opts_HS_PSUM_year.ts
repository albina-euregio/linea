import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for snow-height/year [cm]
 */

export const opts_HS_year: uPlot.Options = {
  ms: 1, // timestamp multiplier that yields 1 millisecond
  width: 1040,
  height: 300,
  padding: [50, 50, 0, 50],
  cursor: cursorOpts,
  legend: {
    show: true,
    live: true,
    fill: (u: any, seriesIdx: any) => u.series[seriesIdx].stroke(u, seriesIdx),
    markers: {
      fill: (u, seriesIdx) => u.series[seriesIdx].stroke(u, seriesIdx),
    },
  },

  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        ctx.save();
        ctx.font = "bold 0.9vm sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const canvasHeight = u.ctx.canvas.height;
        var labely1 = `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`;
        var labely2 = `${i18n.message("dialog:weather-station-diagram:parameter:PSUM")} (mm)`;
        var labelColor1 = "#DE2D26";
        var labelColor2 = "#6aafd5";
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
      },
    ],
  },

  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMax > 500 ? [0, 1000] : [0, 500];
      },
    },
    y2: {
      range: (u, dataMin, dataMax) => {
        return dataMax > 100 ? [0, 150] : [0, 100];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: (u) => {
        const max = u.scales.y.max ?? 0;
        return max > 500 ? [0, 200, 400, 600, 800, 1000] : [0, 100, 200, 300, 400, 500];
      },
    },
    {
      scale: "y2",
      stroke: "#6aafd5",
      side: 1,
      splits: (u) => {
        const max = u.scales.y2.max ?? 0;
        return max > 100 ? [0, 30, 60, 90, 120, 150] : [0, 20, 40, 60, 80, 100];
      },
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

  bands: [
    {
      series: [2, 3],
      fill: "#d9dcdc",
    },
    {
      series: [2, 1],
      fill: "#d9dcdc",
    },
  ],
};
const baseHsSeries = (key: string, color: string, width = 2): uPlot.Series => ({
  label: i18n.message(`dialog:weather-station-diagram:parameter:${key}`),
  stroke: color,
  width,
  points: { show: false },
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
});

export const opts_HS_year_min = baseHsSeries("HS_min", "#d9dcdc", 2);
export const opts_HS_year_max = baseHsSeries("HS_max", "#d9dcdc", 0);
export const opts_HS_year_median = baseHsSeries("HS_median", "#878787", 2);
export const opts_HS_year_current = baseHsSeries("HS", "#ff0000", 2);

export const opts_HS_year_PSUM: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:PSUM"),
  paths: uPlot.paths.bars(),
  points: { show: false },
  stroke: "#6aafd5",
  fill: "#6aafd5",
  scale: "y2",
  value: (u, v) =>
    v == null || Number.isNaN(v) ? "-" : i18n.number(Math.round(v * 10) / 10, {}, "mm"),
};
