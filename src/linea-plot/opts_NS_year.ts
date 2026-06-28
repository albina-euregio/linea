import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";

const NS = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:newsnow")} (cm)`,
  labelColor: "#DE2D26",
  scale: { range: [0, 70] },
  axis: {
    scale: "y",
    stroke: "#DE2D26",
    splits: LineaChartParameter.splits("y", {
      mins: [0],
      maxs: [70],
      splits: [[0, 20, 40, 60]],
      splitcount: 9,
    }),
  },
  series: {
    label: i18n.message("linea:parameter:newsnow"),
    paths: uPlot.paths.bars(),
    points: { show: false },
    stroke: "#DE2D26",
    fill: "#DE2D26",
    scale: "y",
    value: (_u, v) =>
      v == null || Number.isNaN(v) ? "-" : i18n.number(Math.round(v * 10) / 10, {}, "cm"),
  },
});

/**
 * uPlot options for new snow/year [cm]
 */
export const opts_NS_year: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  padding: [20, 52, 0, -10],
  hooks: {
    drawAxes: [
      (u) => {
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, NS);
      },
    ],
  },

  scales: {
    x: timeScale,
    y: NS.scale!,
  },

  axes: [timeAxis, NS.axis],

  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_NS_year_series = NS.series!;

export const opts_NS_year_snow_cover: uPlot.Series = {
  label: i18n.message("linea:parameter:snowcover"),
  scale: "y",
  points: { show: false },
  width: 0,
  stroke: "rgba(222, 45, 38, .4)",
  fill: "rgba(222, 45, 38, .15)",
  value: () => "-",
};
