import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { OptsHelper } from "./opts-helper";

/**
 * uPlot options for Relative Luftfeuchtigkeit [%] & Globalstrahlung [W/m²]
 */
export const opts_RH_GR: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        var labely1 = `${i18n.message("linea:parameter:RH")} (%)`;
        var labely2 = `${i18n.message("linea:parameter:ISWR")} (W/m²)`;
        var labelColor1 = "#8a7474";
        var labelColor2 = "#DE2D26";
        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          labelColor1,
          labelColor2,
        );
      },
    ],
  },

  scales: {
    x: timeScale,
    y: {
      range: [0, 100],
    },
    y2: {
      range: [0, 1200],
    },
  },
  axes: [
    timeAxis,
    {
      scale: "y",
      splits: [0, 25, 50, 75, 100],
      stroke: "#8a7474",
      grid: {
        show: false,
      },
    },
    {
      scale: "y2",
      splits: [0, 300, 600, 900, 1200],
      stroke: "#DE2D26",
      side: 1,
      grid: {
        show: true,
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

export const opts_RH: uPlot.Series = {
  label: i18n.message("linea:parameter:RH"),
  stroke: "#8a7474",
  scale: "y",
  width: 1.5,
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "%"),
};

export const opts_ISWR: uPlot.Series = {
  label: i18n.message("linea:parameter:ISWR"),
  stroke: "#DE2D26",
  fill: "rgba(255,0,0,0.1)",
  scale: "y2",
  width: 1.5,
  value: (_u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "W/m²"),
};
