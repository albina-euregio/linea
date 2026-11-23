import type uPlot from "uplot";
import { time } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";

export const RH = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:RH")} (%)`,
  labelColor: "#8a7474",
  scale: { range: [0, 100] },
  axis: {
    scale: "y",
    stroke: "#8a7474",
    splits: [0, 25, 50, 75, 100],
    grid: { show: false },
  },
  series: {
    label: i18n.message("linea:parameter:RH"),
    stroke: "#8a7474",
    scale: "y",
    width: 1.5,
    gaps: LineaOptsHelper.spanSamplingIntervalGaps(),
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "%"),
  },
});
RH.forecast = { ...RH.series, label: "Forecast", dash: [8, 6] };
RH.forecastBand = LineaChartParameter.forecastBand(RH.series!, "rgba(138, 116, 116, 0.2)");

export const ISWR = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:ISWR")} (W/m²)`,
  labelColor: "#DE2D26",
  scale: { range: [0, 1200] },
  axis: {
    scale: "y2",
    stroke: "#DE2D26",
    side: 1,
    splits: [0, 300, 600, 900, 1200],
    grid: { show: true },
  },
  series: {
    label: i18n.message("linea:parameter:ISWR"),
    stroke: "#DE2D26",
    fill: "rgba(255,0,0,0.1)",
    scale: "y2",
    width: 1.5,
    gaps: LineaOptsHelper.spanSamplingIntervalGaps(),
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "W/m²"),
  },
});
// hatched instead of the solid fill, so the forecast area is not mistaken for measurements
ISWR.forecast = {
  ...ISWR.series,
  fill: LineaOptsHelper.hatchFill("rgba(222, 44, 44, 0.4)"),
  dash: [8, 6],
  label: "Forecast",
};

/**
 * uPlot options for Relative Luftfeuchtigkeit [%] & Globalstrahlung [W/m²]
 */
export const opts_RH_GR: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, RH, ISWR);
      },
    ],
  },

  scales: {
    x: time.scale!,
    [RH.axis.scale]: RH.scale!,
    [ISWR.axis.scale]: ISWR.scale!,
  },
  axes: [time.axis!, RH.axis, ISWR.axis],

  series: [time.series!],
};
