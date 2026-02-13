import type uPlot from "uplot";
import { timeAxis } from "./opts_time_axis";
import { i18n } from "../i18n";
import { OptsHelper, type SplitOptions } from "./opts-helper";

/**
 * uPlot options for Temperature, Dew Point & Snow Surface Temperature
 */
export const opts_TA_TD_TSS: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        var labely1 = `${i18n.message("linea:unit:temperature")} (°C)`;
        var labely2 = `${i18n.message("linea:parameter:TD")} (°C)`;
        var labelColor1 = "#DE2D26";
        var labelColor2 = "#6aafd5";

        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          labelColor1,
          labelColor2,
        );

        // Draw reference line at 0°C
        const width = 1;
        const offset = (width % 2) / 2;
        const x0 = u.bbox.left;
        const y0 = u.valToPos(0, "y", true);
        const x1 = u.bbox.left + u.bbox.width;

        ctx.strokeStyle = "#000";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0 + offset, y0 + offset);
        ctx.lineTo(x1 + offset, y0 + offset);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      },
    ],
    setSelect: [
      (u) => {
        OptsHelper.calculateAxisLimitsInZoom(u, [1, 2, 3]);
      },
    ],
  },

  scales: {
    y: {
      range: (_u, _dataMin, dataMax) => {
        return dataMax > 10 ? [-30, 30] : [-30, 10];
      },
    },

    yhidden: {
      range: [0, 1],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      side: 3,
      stroke: "#DE2D26",
      grid: { show: true },
      splits: (u) => {
        return OptsHelper.getSplits({
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

      values: (u, vals) => vals.map((v) => v.toString()),
    },
    {
      scale: "y",
      side: 1,
      stroke: "#6aafd5",
      grid: {
        show: false,
      },
      splits: (u) => {
        return OptsHelper.getSplits({
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
      values: (u, vals) => vals.map((v) => v.toString()),
    },
    {
      scale: "yhidden",
      show: false,
    },
  ],

  series: [
    {
      label: i18n.message("linea:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

const createSeries = (labelKey: any, color: string): uPlot.Series => ({
  label: i18n.message(labelKey),
  stroke: color,
  scale: "y",
  width: 2,
  spanGaps: false,
  value: (u, v) => (v === null || Number.isNaN(v) ? "-" : i18n.number(v, {}, "°C")),
});

export const opts_TA = createSeries("linea:unit:temperature", "#DE2D26");
export const opts_TD = createSeries("linea:parameter:TD", "#6aafd5");
export const opts_TSS = createSeries("linea:parameter:TSS", "#FC9272");

export const opts_SurfaceHoar: uPlot.Series = {
  label: i18n.message("linea:parameter:SH:potential"),
  width: 2,
  scale: "yhidden",
  spanGaps: false,
  fill: "rgba(1, 0, 0, 0.1)",
  stroke: "rgba(0, 0, 0, 0.1)",
  value: (u, v) =>
    v == null
      ? "-"
      : v > 0
        ? i18n.message("linea:parameter:SH:present")
        : i18n.message("linea:parameter:SH:present:not"),
};
