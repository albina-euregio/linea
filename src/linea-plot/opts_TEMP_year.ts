import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

/**
 * uPlot options for snow-height/year [cm]
 */

export const opts_TEMP_year: uPlot.Options = {
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
        var labely1 = `${i18n.message("dialog:weather-station-diagram:unit:temperature")} (cm)`;
        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          "",
          u.bbox.left,
          u.bbox.width,
          canvasHeight,
          "#DE2D26",
          "",
        );
        ctx.restore();
      },
    ],
  },

  scales: {
    y: {
      range: [-26.5, 14],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#DE2D26",
      splits: [-25, -20, -15, -10, -5, 0, 5, 10],
    },
  ],

  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],

  bands: [
    {
      series: [2, 3],
      fill: "#d9dcdc",
    },
    {
      series: [2, 1],
      fill: "#d9dcdc",
    },
  ],
};

const baseTempSeries = (key: string, color: string, width = 2): uPlot.Series => ({
  label: i18n.message(`dialog:weather-station-diagram:parameter:${key}`),
  stroke: color,
  width,
  points: { show: false },
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "°C"),
});

export const opts_TEMP_year_min = baseTempSeries("TEMP_min", "#d9dcdc", 2);
export const opts_TEMP_year_max = baseTempSeries("TEMP_max", "#d9dcdc", 0);
export const opts_TEMP_year_median = baseTempSeries("TEMP_median", "#878787", 2);
export const opts_TEMP_year_current = baseTempSeries("TEMP", "#DE2D26", 2);
export const opts_DEW_year_current = baseTempSeries("TD", "#6aafd5", 2);
