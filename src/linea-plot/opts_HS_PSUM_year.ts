import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for snow-height/year [cm] 
 */
 
export const opts_HS_year: uPlot.Options = {
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

        const canvasWidth = u.ctx.canvas.width;
        const canvasHeight = u.ctx.canvas.height;
        const yPos = canvasHeight * 0.05;

        const screenwidth = window.innerWidth;
        var optionsHelper = new OptsHelper();
        var labely1 = `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`;
        var labely2 = `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`;
        var labelColor1 = "#DE2D26";
        var labelColor2 = "#6aafd5";
        optionsHelper.UpdateAxisLabels(ctx, labely1, labely2, u.bbox.left, u.bbox.width, canvasHeight, labelColor1, labelColor2);
      },
    ],
  },
  
scales: {
      y: {
        range: [0, 500]
      },
      y2: {
        range: [0, 50]
      },
    },

axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
    },
     {
      scale: "y2",
      splits: [0, 10, 20, 30, 40, 50],
      stroke: "#6aafd5",
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
 
 bands: [
  {
    series: [2, 3],
    fill: "#d9dcdc",
  },
  {
    series: [2, 1],
    fill: "#d9dcdc",
  }
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

export const opts_HS_year_min     = baseHsSeries("HS_min", "#d9dcdc", 2);
export const opts_HS_year_max     = baseHsSeries("HS_max", "#d9dcdc", 0);
export const opts_HS_year_median  = baseHsSeries("HS_median", "#878787", 2);
export const opts_HS_year_current = baseHsSeries("HS", "#ff0000", 2);

export const opts_HS_year_PSUM: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:PSUM"),
  paths: uPlot.paths.bars(),
  points: { show: false },
  stroke: "#6aafd5",
  fill: "#6aafd5",
  scale: "y2",
  value: (u, v) =>
    v == null || Number.isNaN(v)
      ? "-"
      : i18n.number(Math.round(v * 10) / 10, {}, "mm"),
};

