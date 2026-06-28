import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
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
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "%"),
  },
});
RH.forecast = { ...RH.series, label: "Forecast", dash: [8, 6] };

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
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "W/m²"),
  },
});
ISWR.forecast = { ...ISWR.series, label: "Forecast", dash: [8, 6] };

/**
 * uPlot options for Relative Luftfeuchtigkeit [%] & Globalstrahlung [W/m²]
 */
export const opts_RH_GR: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, RH, ISWR);
        LineaOptsHelper.drawForecastInformation(u);
      },
    ],
  },

  scales: {
    x: timeScale,
    [RH.axis.scale]: RH.scale!,
    [ISWR.axis.scale]: ISWR.scale!,
  },
  axes: [timeAxis, RH.axis, ISWR.axis],

  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};
