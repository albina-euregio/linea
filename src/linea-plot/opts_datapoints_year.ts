import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import type { SplitOptions } from "../shared/opts-helper.ts";

/**
 * uPlot options for datapoints/year [cm]
 */

export const opts_DATAPOINTS_year: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  padding: [20, 52, 0, -10],
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:parameter:DATAPOINTS:amount")}`;
        var labely2 = "";
        var labelColor1 = "#00ff55ff";
        var labelColor2 = "";
        LineaOptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          labelColor1,
          labelColor2,
        );
      },
    ],
    setSelect: [
      (u) => {
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1]);
      },
    ],
  },

  scales: {
    x: timeScale,
    y: {
      range: (_u, _dataMin, dataMax) => {
        if (dataMax > 70) {
          return [0, 90];
        } else if (dataMax > 50) {
          return [0, 70];
        } else if (dataMax > 30) {
          return [0, 50];
        } else return [0, 30];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#00ff55ff",
      splits: (u) => {
        return LineaOptsHelper.getSplits({
          uplot: u,
          mins: [0, 0, 0, 0],
          maxs: [30, 50, 70, 90],
          splits: [
            [0, 10, 20, 30],
            [0, 15, 30, 45],
            [0, 20, 40, 60],
            [0, 25, 50, 75],
          ],
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

export const opts_DATAPOINTS_amount_year: uPlot.Series = {
  label: i18n.message("linea:parameter:DATAPOINTS:amount"),
  stroke: "#00ff55ff",
  width: 1.5,
  scale: "y",
  value: (_u, v) =>
    i18n.number(v, {}, i18n.message("linea:unit:DATAPOINTS") as unknown as undefined),
};
