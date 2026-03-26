import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper, type SplitOptions } from "./linea-opts-helper";
import type { ParameterType } from "../data/station-data.ts";

/**
 * uPlot options for snow-height/year [cm]
 */

export const opts_HS_year: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:parameter:HS")} (cm)`;
        var labely2 = `${i18n.message("linea:parameter:PSUM")} (mm)`;
        var labelColor1 = "#08519C";
        var labelColor2 = "#6aafd5";
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
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1, 2, 3, 4]);
      },
    ],
  },

  scales: {
    x: timeScale,
    y: {
      range: (_u, _dataMin, dataMax) => {
        if (dataMax > 500) {
          return [0, 1000];
        } else if (dataMax > 250) {
          return [0, 500];
        } else {
          return [0, 250];
        }
      },
    },
    y2: {
      range: (_u, _dataMin, dataMax) => {
        return dataMax > 100 ? [0, 150] : [0, 100];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#08519C",
      splits: (u) => {
        return LineaOptsHelper.getSplits({
          uplot: u,
          mins: [0, 0, 0],
          maxs: [250, 500, 1000],
          splits: [
            [0, 50, 100, 150, 200, 250],
            [0, 100, 200, 300, 400, 500],
            [0, 200, 400, 600, 800, 1000],
          ],
          splitcount: 9,
        } as SplitOptions);
      },
    },
    {
      scale: "y2",
      stroke: "#6aafd5",
      side: 1,
      splits: (u) => {
        return LineaOptsHelper.getSplits(
          {
            uplot: u,
            mins: [0, 0],
            maxs: [100, 150],
            splits: [
              [0, 20, 40, 60, 80, 100],
              [0, 30, 60, 90, 120, 150],
            ],
            splitcount: 0,
          } as SplitOptions,
          "y2",
        );
      },
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

  bands: [
    {
      series: [2, 3],
      fill: "#d9dcdc",
    },
    {
      series: [3, 1],
      fill: "#d9dcdc",
    },
    {
      series: [2, 1],
      fill: "#d9dcdc",
    },
  ],
};
const baseHsSeries = (key: string, color: string): uPlot.Series => ({
  label: i18n.message(`linea:parameter:${key as ParameterType}`),
  stroke: color,
  width: 1.5,
  scale: "y",
  value: (_u, v) => i18n.number(v, {}, "cm"),
});

export const opts_HS_year_min = baseHsSeries("HS_min", "#d9dcdc");
export const opts_HS_year_max = baseHsSeries("HS_max", "#d9dcdc");
export const opts_HS_year_median = baseHsSeries("HS_median", "#878787");
export const opts_HS_year_current = baseHsSeries("HS", "#08519C");

export const opts_HS_year_PSUM: uPlot.Series = {
  label: i18n.message("linea:parameter:PSUM"),
  paths: uPlot.paths.bars(),
  points: { show: false },
  stroke: "#6aafd5",
  fill: "#6aafd5",
  scale: "y2",
  value: (_u, v) =>
    v == null || Number.isNaN(v) ? "-" : i18n.number(Math.round(v * 10) / 10, {}, "mm"),
};
