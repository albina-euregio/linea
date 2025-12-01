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
        const yPos = canvasHeight * 0.12

        // horizontal label for y-axis
        const xPosY = u.bbox.left*0.73;
        ctx.fillStyle = "#00ff55ff";
        ctx.textAlign = "left";
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
        range: [0, 58]
      },
    },

axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#00ff55ff",
      splits: [0, 10, 20, 30, 40, 50],
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
  value: (u, v) => i18n.number(v, {}, i18n.message("dialog:weather-station-diagram:unit:DATAPOINTS")),
};