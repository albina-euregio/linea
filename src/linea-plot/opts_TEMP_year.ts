import { time } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";
import type { ParameterType } from "../data/station-data";

const TA = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:TA")} (℃)`,
  labelColor: "#DE2D26",
  scale: { range: (_u, _dataMin, dataMax) => (dataMax > 20 ? [-30, 30] : [-30, 20]) },
  axis: {
    scale: "y",
    stroke: "#DE2D26",
    splits: LineaChartParameter.splits("y", {
      mins: [-30, -30],
      maxs: [10, 30],
      splits: [
        [-30, -20, -10, 0, 10],
        [-30, -20, -10, 0, 10, 20, 30],
      ],
      splitcount: 9,
    }),
  },
});

const TSS = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:TSS")} (℃)`,
  labelColor: "#FC9272",
  scale: { range: (_u, _dataMin, dataMax) => (dataMax > 20 ? [-30, 30] : [-30, 20]) },
  axis: {
    scale: "y2",
    stroke: "#FC9272",
    side: 1,
    splits: LineaChartParameter.splits("y2", {
      mins: [-30, -30],
      maxs: [10, 30],
      splits: [
        [-30, -20, -10, 0, 10],
        [-30, -20, -10, 0, 10, 20, 30],
      ],
      splitcount: 9,
    }),
    grid: { show: false },
  },
});

/**
 * uPlot options for temperature/year [cm]
 */
export const opts_TEMP_year: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, TA, TSS);
      },
    ],
    setSelect: [
      (u) => {
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1, 2, 3, 4]);
      },
    ],
  },

  scales: {
    x: time.scale!,
    [TA.axis.scale]: TA.scale!,
    [TSS.axis.scale]: TSS.scale!,
  },

  axes: [time.axis!, TA.axis, TSS.axis],

  series: [time.series!],

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
  label: i18n.message(`linea:parameter:${key as ParameterType}`),
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
