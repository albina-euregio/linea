import type uPlot from "uplot";
import { timeAxis, timeScale } from "./opts_time_axis";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import type { SplitOptions } from "../shared/opts-helper.ts";

/**
 * uPlot options for Schneehöhe [cm] & Niederschlag 24h [mm]
 */
export const opts_HS_PSUM: uPlot.Options = {
  ...LineaOptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:parameter:HS")} (cm)`;
        var labely2 = `${i18n.message("linea:parameter:PSUM")} (mm)`;
        var labelColor1 = "#08519C";
        var labelColor2 = "#6aafd5";
        LineaOptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          labelColor1,
          labelColor2,
        );
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
    y: {
      range: (_u, _dataMin, dataMax) => {
        return dataMax > 200 ? [0, 400] : [0, 200];
      },
    },
    y2: {
      range: (_u, _dataMin, dataMax) => {
        return dataMax > 60 ? [0, 120] : [0, 60];
      },
    },
  },
  axes: [
    timeAxis,
    {
      scale: "y",
      splits: (u) => {
        return LineaOptsHelper.getSplits({
          uplot: u,
          mins: [0, 0],
          maxs: [200, 400],
          splits: [
            [0, 50, 100, 150, 200],
            [0, 100, 200, 300, 400],
          ],
          splitcount: 5,
        } as SplitOptions);
      },
      stroke: "#08519C",
    },
    {
      scale: "y2",
      splits: (u) => {
        return LineaOptsHelper.getSplits(
          {
            uplot: u,
            mins: [0, 0],
            maxs: [60, 120],
            splits: [
              [0, 15, 30, 45, 60],
              [0, 30, 60, 90, 120],
            ],
            splitcount: 5,
          } as SplitOptions,
          "y2",
        );
      },
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
  value: (_u, v) => i18n.number(v, {}, "cm"),
};

export const opts_HS_FORECAST: uPlot.Series = {
  ...opts_HS,
  label: "Forecast",
  dash: [8, 6],
};

export const opts_PSUM: uPlot.Series = {
  label: i18n.message("linea:parameter:PSUM"),
  stroke: "#6aafd5",
  fill: "rgba(106, 175, 213, 0.3)",
  scale: "y2",
  width: 1.5,
  value: (_u, v) => i18n.number(v, {}, "mm"),
};

export const opts_PSUM_FORECAST: uPlot.Series = {
  ...opts_PSUM,
  label: "Forecast",
  fill: undefined,
  dash: [8, 6],
};
