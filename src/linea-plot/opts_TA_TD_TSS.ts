import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";

const TEMP_SPLITS = LineaChartParameter.splits("y", {
  mins: [-30, -30],
  maxs: [10, 30],
  splits: [
    [-30, -20, -10, 0, 10],
    [-30, -20, -10, 0, 10, 20, 30],
  ],
  splitcount: 9,
});

// Left and right axis share the same "y" scale; the right one only mirrors it.
const TA = new LineaChartParameter({
  label: `${i18n.message("linea:unit:temperature")} (℃)`,
  labelColor: "#DE2D26",
  scale: { range: (_u, _dataMin, dataMax) => (dataMax > 10 ? [-30, 30] : [-30, 10]) },
  axis: {
    scale: "y",
    side: 3,
    stroke: "#DE2D26",
    grid: { show: true },
    splits: TEMP_SPLITS,
    values: (_u, vals) => vals.map((v) => v.toString()),
  },
});

const TD = new LineaChartParameter({
  label: `${i18n.message("linea:parameter:TD")} (℃)`,
  labelColor: "#6aafd5",
  axis: {
    scale: "y",
    side: 1,
    stroke: "#6aafd5",
    grid: { show: false },
    splits: TEMP_SPLITS,
    values: (_u, vals) => vals.map((v) => v.toString()),
  },
});

const SurfaceHoar = new LineaChartParameter({
  scale: { range: [0, 1] },
  axis: { scale: "yhidden", show: false },
  series: {
    label: i18n.message("linea:parameter:SH:potential"),
    width: 0,
    scale: "yhidden",
    spanGaps: false,
    fill: "rgba(1, 0, 0, 0.1)",
    stroke: "rgba(0, 0, 0, 0.1)",
    value: (_u, v) =>
      v == null
        ? "-"
        : v > 0
          ? i18n.message("linea:parameter:SH:present")
          : i18n.message("linea:parameter:SH:present:not"),
  },
});

/**
 * uPlot options for Temperature, Dew Point & Snow Surface Temperature
 */
export const opts_TA_TD_TSS: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        LineaOptsHelper.UpdateAxisLabelsForParameters(u, TA, TD);

        // Draw reference line at 0℃
        LineaOptsHelper.drawReferenceLine(u, 0, "#000");
        LineaOptsHelper.drawForecastInformation(u);
        ctx.restore();
      },
    ],
    setSelect: [
      (u) => {
        LineaOptsHelper.calculateAxisLimitsInZoom(u, [1, 2, u.series.length - 1]);
      },
    ],
  },

  scales: {
    x: timeScale,
    [TA.axis.scale]: TA.scale!,
    [SurfaceHoar.axis.scale]: SurfaceHoar.scale!,
  },

  axes: [timeAxis, TA.axis, TD.axis, SurfaceHoar.axis],

  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

const createSeries = (labelKey: any, color: string, dashed = false): uPlot.Series => ({
  label: i18n.message(labelKey),
  stroke: color,
  scale: "y",
  width: 1.5,
  dash: dashed ? [8, 6] : undefined,
  spanGaps: false,
  value: (_u, v) => (v === null || Number.isNaN(v) ? "-" : i18n.number(v, {}, "℃")),
});

export const opts_TA = createSeries("linea:parameter:TA", "#DE2D26");
export const opts_TD = createSeries("linea:parameter:TD", "#6aafd5");
export const opts_TSS = createSeries("linea:parameter:TSS", "#FC9272");
export const opts_TA_FORECAST = createSeries("linea:parameter:TA", "#DE2D26", true);
export const opts_TD_FORECAST = createSeries("linea:parameter:TD", "#6aafd5", true);
opts_TA_FORECAST.label = "Forecast";
opts_TD_FORECAST.label = "Forecast";

export const opts_SurfaceHoar = SurfaceHoar.series!;
