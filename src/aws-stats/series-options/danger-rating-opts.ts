import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { OptsHelper } from "./opts-helper";
import { i18n } from "../../i18n";

export const opts_danger_rating: uPlot.Options = {
  ...OptsHelper.getDefaultOptions(),
  title: i18n.message("chart:dangerrating:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("chart:dangerrating:yaxis:dangerrating")}`;
        OptsHelper.UpdateAxisLabels(
          u,
          labely1,
          "",
          u.bbox.left,
          u.bbox.width,
          "#000000",
          "#000000",
        );
      },
    ],
  },
  scales: {
    x: { ...timeScale },
    y: {
      range: [0.6, 5.4],
    },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
      splits: [1, 2, 3, 4, 5],
    },
  ],
  series: [{}],
  cursor: { show: true, drag: { x: true, y: true, uni: 50, dist: 10 } },
};

export const opts_danger_rating_series_base: uPlot.Series = {
  stroke: "#4108dd69",
  scale: "y",
  width: 1.5,
};

export const opts_danger_rating_series_all: uPlot.Series = {
  ...opts_danger_rating_series_base,
  label: i18n.message("chart:dangerrating:series:dangerrating"),
};
