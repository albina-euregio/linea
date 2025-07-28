import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

/**
 * uPlot options for Schneehöhe [cm] & Niederschlag 24h [mm]
 */
export const opts_HS_PSUM: uPlot.Options = {
  width: 1040,
  height: 300,
  padding: [50, 50, 0, 50],
  cursor: cursorOpts,
  legend: {
    show: true,
    live: true,
    fill: (u, seriesIdx) => u.series[seriesIdx].stroke(u, seriesIdx),
    markers: {
      fill: (u, seriesIdx) => u.series[seriesIdx].stroke(u, seriesIdx),
    },
  },
  hooks: {
    drawAxes: [
      (u) => {
         const ctx = u.ctx;
         ctx.save();
        ctx.font = "bold 1vm sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "bottom";
                        
        const canvasWidth = u.ctx.canvas.width;
         const canvasHeight = u.ctx.canvas.height;
        const yPos = canvasHeight * 0.05;

        // horizontal label for y-axis
        const xPosY = canvasWidth * 0.1;
                        ctx.fillStyle = "#08519C";
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`,
          xPosY,
          yPos
        );

        // horizontal label for y2-axis
        const xPosY2 = canvasWidth * 0.9;
                        ctx.fillStyle = "#6aafd5";
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:PSUM")} (mm)`,
          xPosY2,
          yPos
        );

                        ctx.restore();
      },
    ],
  },

  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMin < 0 || dataMax > 250 ? [0, 500] : [0, 250];
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
        const min = u.scales.y.min;
        const max = u.scales.y.max;
        return min <= 0 && max >= 500
          ? [0, 100, 200, 300, 400, 500]
          : [0, 50, 100, 150, 200, 250];
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
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_HS: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:HS"),
  stroke: "#08519C",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, {}, "cm"),
};

export const opts_PSUM: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:PSUM"),
  stroke: "#6aafd5",
  fill: "rgba(106, 175, 213, 0.3)",
  scale: "y2",
  width: 1,
  value: (u, v) => i18n.number(v, {}, "mm"),
};
