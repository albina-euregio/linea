import uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper, type SplitOptions } from "./linea-opts-helper";

/**
 * uPlot options for temperature/year [cm]
 */

export const opts_TEMP_year: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:parameter:TA")} (℃)`;
        var labely2 = `${i18n.message("linea:parameter:TSS")} (℃)`;
        LineaOptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          "#DE2D26",
          "#FC9272",
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
        return dataMax > 20 ? [-30, 30] : [-30, 20];
      },
    },
    y2: {
      range: (_u, _dataMin, dataMax) => {
        return dataMax > 20 ? [-30, 30] : [-30, 20];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: (u) => {
        return LineaOptsHelper.getSplits({
          uplot: u,
          mins: [-30, -30],
          maxs: [10, 30],
          splits: [
            [-30, -20, -10, 0, 10],
            [-30, -20, -10, 0, 10, 20, 30],
          ],
          splitcount: 9,
        } as SplitOptions);
      },
    },
    {
      scale: "y2",
      stroke: "#FC9272",
      side: 1,
      splits: (u) => {
        return LineaOptsHelper.getSplits(
          {
            uplot: u,
            mins: [-30, -30],
            maxs: [10, 30],
            splits: [
              [-30, -20, -10, 0, 10],
              [-30, -20, -10, 0, 10, 20, 30],
            ],
            splitcount: 9,
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

const baseTempSeries = (key: string, color: string): uPlot.Series => ({
  label: i18n.message(`linea:parameter:${key}`),
  stroke: color,
  width: 1.5,
  scale: "y",
  value: (_u, v) => i18n.number(v, {}, "℃"),
});

export const opts_TEMP_year_min = baseTempSeries("TEMP_min", "#d9dcdc");
export const opts_TEMP_year_max = baseTempSeries("TEMP_max", "#d9dcdc");
export const opts_TEMP_year_median = baseTempSeries("TEMP_median", "#878787");
export const opts_TEMP_year_current = baseTempSeries("TEMP", "#DE2D26");
export const opts_DEW_year_current = baseTempSeries("TSS", "#FC9272");
