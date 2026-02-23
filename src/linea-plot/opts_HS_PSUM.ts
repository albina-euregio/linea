import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { OptsHelper, type SplitOptions } from "./opts-helper";

/**
 * uPlot options for Schneehöhe [cm] & Niederschlag 24h [mm]
 */
export const opts_HS_PSUM: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        var labely1 = `${i18n.message("linea:parameter:HS")} (cm)`;
        var labely2 = `${i18n.message("linea:parameter:PSUM")} (mm)`;
        var labelColor1 = "#08519C";
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
      },
    ],
    setSelect: [
      (u) => {
        OptsHelper.calculateAxisLimitsInZoom(u, [1]);
      },
    ],
  },

  scales: {
    x: timeScale,
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMax > 250 ? [0, 500] : [0, 250];
      },
    },
    y2: {
      range: [0, 100],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      splits: (u) => {
        return OptsHelper.getSplits({
          uplot: u,
          mins: [0, 0],
          maxs: [250, 500],
          splits: [
            [0, 50, 100, 150, 200, 250],
            [0, 100, 200, 300, 400, 500],
          ],
          splitcount: 6,
        } as SplitOptions);
      },
      stroke: "#08519C",
    },
    {
      scale: "y2",
      splits: [0, 20, 40, 60, 80, 100],
      stroke: "#6aafd5",
      side: 1,
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
};

export const opts_HS: uPlot.Series = {
  label: i18n.message("linea:parameter:HS"),
  stroke: "#08519C",
  scale: "y",
  width: 1.5,
  value: (u, v) => i18n.number(v, {}, "cm"),
};

export const opts_PSUM: uPlot.Series = {
  label: i18n.message("linea:parameter:PSUM"),
  stroke: "#6aafd5",
  fill: "rgba(106, 175, 213, 0.3)",
  scale: "y2",
  width: 1.5,
  value: (u, v) => i18n.number(v, {}, "mm"),
};
