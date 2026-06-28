import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";

export const HS = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:HS")} (cm)`,
  labelColor: "#08519C",
  scale: { range: (_u, _dataMin, dataMax) => (dataMax > 200 ? [0, 400] : [0, 200]) },
  axis: {
    scale: "y",
    stroke: "#08519C",
    splits: LineaChartParameter.splits("y", {
      mins: [0, 0],
      maxs: [200, 400],
      splits: [
        [0, 50, 100, 150, 200],
        [0, 100, 200, 300, 400],
      ],
      splitcount: 5,
    }),
  },
  series: {
    label: i18n.message("linea:parameter:HS"),
    stroke: "#08519C",
    scale: "y",
    width: 1.5,
    value: (_u, v) => i18n.number(v, {}, "cm"),
  },
});
HS.forecast = { ...HS.series, label: "Forecast", dash: [8, 6] };

export const PSUM = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:PSUM")} (mm)`,
  labelColor: "#6aafd5",
  scale: { range: (_u, _dataMin, dataMax) => (dataMax > 60 ? [0, 120] : [0, 60]) },
  axis: {
    scale: "y2",
    stroke: "#6aafd5",
    side: 1,
    grid: { show: false },
    splits: LineaChartParameter.splits("y2", {
      mins: [0, 0],
      maxs: [60, 120],
      splits: [
        [0, 15, 30, 45, 60],
        [0, 30, 60, 90, 120],
      ],
      splitcount: 5,
    }),
  },
  series: {
    label: i18n.message("linea:parameter:PSUM"),
    stroke: "#6aafd5",
    fill: "rgba(106, 175, 213, 0.3)",
    scale: "y2",
    width: 1.5,
    value: (_u, v) => i18n.number(v, {}, "mm"),
  },
});
PSUM.forecast = { ...PSUM.series, label: "Forecast", fill: undefined, dash: [8, 6] };

/**
 * uPlot options for Schneehöhe [cm] & Niederschlag 24h [mm]
 */
export const opts_HS_PSUM: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, HS, PSUM);
        LineaOptsHelper.drawForecastInformation(u);
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
    [HS.axis.scale]: HS.scale!,
    [PSUM.axis.scale]: PSUM.scale!,
  },
  axes: [timeAxis, HS.axis, PSUM.axis],

  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};
