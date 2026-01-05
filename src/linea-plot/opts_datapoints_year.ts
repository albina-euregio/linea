import uPlot from "uplot";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for snow-height/year [cm]
 */

export const opts_DATAPOINTS_year: uPlot.Options = {
  ...OptsHelper.getLineaOptions(),
  hooks: {
    drawAxes: [
      (u) => {
        const ctx = u.ctx;
        ctx.save();
        ctx.font = "bold 0.9vm sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const canvasHeight = u.ctx.canvas.height;
        var labely1 = `${i18n.message("dialog:weather-station-diagram:parameter:DATAPOINTS:amount")}`;
        var labely2 = "";
        var labelColor1 = "#00ff55ff";
        var labelColor2 = "";
        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          canvasHeight,
          labelColor1,
          labelColor2,
        );
      },
    ],
  },

  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMax > 50 ? [0, 65] : [0, 50];
      },
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#00ff55ff",
      splits: (u) => {
        const max = u.scales.y.max ?? 0;
        return max > 50 ? [0, 10, 20, 30, 40, 50, 60] : [0, 10, 20, 30, 40, 50];
      },
    },
  ],

  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_DATAPOINTS_amount_year: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:DATAPOINTS:amount"),
  stroke: "#00ff55ff",
  width: 2,
  points: { show: false },
  scale: "y",
  value: (u, v) =>
    i18n.number(v, {}, i18n.message("dialog:weather-station-diagram:unit:DATAPOINTS")),
};
