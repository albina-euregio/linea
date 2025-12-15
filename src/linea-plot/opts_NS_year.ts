import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for snow-height/year [cm]
 */

export const opts_NS_year: uPlot.Options = {
  ms: 1, // timestamp multiplier that yields 1 millisecond
  width: 1040,
  height: 300,
  padding: [50, 50, 0, 50],
  cursor: cursorOpts,
  legend: {
    show: true,
    live: true,
    fill: (u, seriesIdx) => u.series[seriesIdx].stroke(u, seriesIdx),
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
        var labely1 = `${i18n.message("dialog:weather-station-diagram:parameter:newsnow")} (cm)`;
        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          "",
          u.bbox.left,
          u.bbox.width,
          canvasHeight,
          "#DE2D26",
          "",
        );
        ctx.restore();
      },
    ],
  },

  scales: {
    y: {
      range: [0, 27],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: [0, 5, 10, 15, 20, 25],
    },
  ],

  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_NS_year_series: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:newsnow"),
  paths: uPlot.paths.bars(),
  points: { show: false },
  stroke: "#DE2D26",
  fill: "#DE2D26",
  scale: "y",
  value: (u, v) =>
    v == null || Number.isNaN(v) ? "-" : i18n.number(Math.round(v * 10) / 10, {}, "cm"),
};

export const opts_NS_year_snow_cover: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:snowcover"),
  stroke: "#rgba(222, 45, 38, 0.2)",
  width: 2,
  scale: "y",
  fill: "rgba(222, 45, 38, 0.2)",
  value: () => "-",
};
