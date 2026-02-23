import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { OptsHelper, type SplitOptions } from "./opts-helper";

/**
 * uPlot options for new snow/year [cm]
 */

export const opts_NS_year: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  padding: [20, 52, 0, -10],
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        var labely1 = `${i18n.message("linea:parameter:newsnow")} (cm)`;
        OptsHelper.UpdateAxisLabels(ctx, labely1, "", u.bbox.left, u.bbox.width, "#DE2D26", "");
        ctx.restore();
      },
    ],
  },

  scales: {
    x: timeScale,
    y: {
      range: (_u, _dataMin, _dataMax) => {
        return [0, 70];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: (u) => {
        return OptsHelper.getSplits({
          uplot: u,
          mins: [0],
          maxs: [70],
          splits: [[0, 20, 40, 60]],
          splitcount: 9,
        } as SplitOptions);
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

export const opts_NS_year_series: uPlot.Series = {
  label: i18n.message("linea:parameter:newsnow"),
  paths: uPlot.paths.bars(),
  points: { show: false },
  stroke: "#DE2D26",
  fill: "#DE2D26",
  scale: "y",
  value: (_u, v) =>
    v == null || Number.isNaN(v) ? "-" : i18n.number(Math.round(v * 10) / 10, {}, "cm"),
};

export const opts_NS_year_snow_cover: uPlot.Series = {
  label: i18n.message("linea:parameter:snowcover"),
  scale: "y",
  points: { show: false },
  width: 0,
  stroke: "rgba(222, 45, 38, .4)",
  fill: "rgba(222, 45, 38, .15)",
  value: () => "-",
};
