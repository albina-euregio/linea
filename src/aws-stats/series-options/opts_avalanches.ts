import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { OptsHelper } from "./opts-helper";
import { i18n } from "../i18n";

/**
 * uPlot options for Schneehöhe [cm] & Niederschlag 24h [mm]
 */
export const opts_avalanches: uPlot.Options = {
  ...OptsHelper.getDefaultOptions(),
  title: i18n.message("chart:observations:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("chart:observations:yaxis:count")}`;
        var labely2 = `${i18n.message("chart:observations:yaxis:precipitation")}`;

        OptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          "#000000",
          "#000000",
        );
      },
    ],
  },
  legend: {
    show: true,
    live: true,
    fill: (u: any, seriesIdx: number) => u.series[seriesIdx].stroke(u, seriesIdx),
    markers: {
      fill: (u: any, seriesIdx: number) =>
        u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
    },
  } as any,
  scales: {
    x: timeScale,
    y: {
      auto: true,
    },
    y2: {
      auto: true,
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y2",
      side: 1,
      grid: {
        show: false,
      },
    },
    {
      scale: "y",
    },
  ],

  series: [
    {
      label: i18n.message("chart:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_series_precipitation = {
  label: i18n.message("chart:observations:series:precipitation"),
  stroke: "#4108dd69",
  fill: "rgba(89, 146, 192, 0.2)",
  scale: "y2",
  width: 1.5,
};

export const opts_series_observations = {
  label: i18n.message("chart:observations:series:observations"),
  stroke: "#6aafd5",
  fill: "rgba(106, 175, 213, 0.3)",
  points: { show: false },
  paths: uPlot.paths.bars!(),
  scale: "y",
  width: 1,
};

export const opts_series_avalanches = {
  label: i18n.message("chart:observations:series:avalanches"),
  stroke: "#d56a6a",
  fill: "rgba(213, 131, 106, 0.3)",
  points: { show: false },
  paths: uPlot.paths.bars!(),
  scale: "y",
  width: 1,
};
