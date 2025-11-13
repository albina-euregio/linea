import uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

/**
 * uPlot options for snow-height/year [cm] 
 */
 
export const opts_DATAPOINTS_year: uPlot.Options = {
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
        ctx.font = "bold 0.9vm sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const canvasWidth = u.ctx.canvas.width;
        const canvasHeight = u.ctx.canvas.height;
        const yPos = canvasHeight * 0.05;

        // horizontal label for y-axis
        const xPosY = canvasWidth * 0.1;
        ctx.fillStyle = "#000000";
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:DATAPOINTS:amount")}`,
          xPosY,
          yPos
        );

        ctx.restore();
      },
    ],
  },
  
scales: {
      y: {
        range: [0, 28]
      },
    },

axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#000000",
      splits: [0, 5, 10, 15, 20, 25],
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
  stroke: "#ffa500",
  width: 2,
  points: { show: false },
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
};