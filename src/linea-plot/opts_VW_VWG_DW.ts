import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";

const VW = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:VW")} (km∕h)`,
  labelColor: "#00E2B6",
  scale: {
    range: (_u, _dataMin, dataMax) => {
      const closest = [100, 120, 160, 230, 300].reduce((prev, curr) =>
        dataMax > prev && dataMax <= curr ? curr : prev,
      );
      return [0, closest];
    },
  },
  axis: {
    scale: "y",
    side: 3,
    stroke: "#00E2B6",
    grid: { show: true },
    splits: LineaChartParameter.splits("y", {
      mins: [0, 0, 0, 0, 0],
      maxs: [100, 120, 160, 230, 300],
      splits: [
        [0, 25, 50, 75, 100],
        [0, 30, 60, 90, 120],
        [0, 40, 80, 120, 160],
        [0, 60, 120, 180, 230],
        [0, 75, 150, 225, 300],
      ],
      splitcount: 5,
    }),
    values: (_, vals) => vals.map((v) => v.toString()),
  },
  series: {
    label: i18n.message("linea:parameter:VW"),
    stroke: "#00E2B6",
    scale: "y",
    width: 1.5,
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km∕h"),
  },
});
VW.forecast = { ...VW.series, label: "Forecast", dash: [8, 6] };

const DW = new LineaChartParameter({
  label: i18n.message("linea:parameter:DW"),
  labelColor: "#084D40",
  scale: { range: [0, 360] },
  axis: {
    splits: [0, 90, 180, 270, 360],
    stroke: "#084D40",
    values: ["N", "E", "S", "W", "N"],
    scale: "y2",
    side: 1,
    grid: { show: false },
  },
  series: {
    label: i18n.message("linea:parameter:DW"),
    stroke: "#084D40",
    paths: () => null,
    points: {
      space: 0,
      fill: "#084D40",
      size: 4,
    },
    scale: "y2",
    value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "°"),
  },
});
DW.forecast = {
  ...DW.series,
  label: "Forecast",
  stroke: "#084D40",
  points: {
    fill: "#084D40",
    space: 0,
    width: 1,
    size: 4,
    dash: [8, 6],
  },
};

/**
 * uPlot options for Windgeschwindigkeit [km/h] & Windrichtung [˚]
 */
export const opts_VW_VWG_DW: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, VW, DW);
        // Draw reference line at 25 km∕h (working group decision)
        LineaOptsHelper.drawReferenceLine(u, 25, "#000");
        LineaOptsHelper.drawForecastInformation(u);

        ctx.restore();
      },
    ],
    setSelect: [
      (u) => {
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1, 2]);
      },
    ],
  },
  scales: {
    x: timeScale,
    [VW.axis.scale]: VW.scale!,
    [DW.axis.scale]: DW.scale!,
  },
  axes: [timeAxis, VW.axis, DW.axis],
  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_VW = VW.series!;
export const opts_VW_FORECAST = VW.forecast;

export const opts_DW = DW.series!;
export const opts_DW_FORECAST = DW.forecast;

export const opts_VW_MAX: uPlot.Series = {
  label: i18n.message("linea:parameter:VW_MAX"),
  stroke: "#00A484",
  scale: "y",
  width: 1.5,
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km∕h"),
};

export const opts_VW_MAX_FORECAST: uPlot.Series = {
  ...opts_VW_MAX,
  label: "Forecast",
  dash: [8, 6],
};
