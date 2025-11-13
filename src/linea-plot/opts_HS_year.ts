import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

/**
 * uPlot options for snow-height/year [cm] 
 */
 
export const opts_HS_year: uPlot.Options = {
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
        const tickPadding = 100; // space between tick labels and axis label
        const labelOffset = 60; // additional offset for label position
        const xPosY = canvasWidth * 0.1;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(xPosY, canvasHeight/2 ); // Adjust +10 for padding, center vertically
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counterclockwise
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`,
          xPosY,
          yPos
        );
        ctx.restore();

        // horizontal label for y2-axis
        const xPosY2 = canvasWidth * 0.9 + labelOffset + 30;
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(xPosY2, canvasHeight/2 ); // Adjust +10 for padding, center vertically
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counterclockwise
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`,
          0,
          0
        );

        ctx.restore();
      },
    ],
  },
  
scales: {
      y: {
        range: [0, 500]
      },
      y2: {
        range: [0, 500]
      },
    },

axes: [
    timeAxis,
    {
      scale: "y",
      stroke: "#000000",
      splits: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
    },
     {
      scale: "y2",
      splits: [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500],
      stroke: "#000000",
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
 
 bands: [
  {
    series: [2, 3],
    fill: "#d9dcdc",
  },
  {
    series: [2, 1],
    fill: "#d9dcdc",
  }
],  
};

export const opts_HS_min: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:HS_min"),
  stroke: "#d9dcdc",
  width: 2,
  points: {show: false},
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
};

export const opts_HS_max: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:HS_max"),
  stroke: "#d9dcdc",
  width: 0,
  points: {show: false},
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
};

export const opts_HS_median: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:HS_median"),
  stroke: "#878787",
  width: 2,
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
};

export const opts_HS_current: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:HS"),
  stroke: "#ff0000",
  width: 2,
  scale: "y",
  value: (u, v) => i18n.number(v, {}, "cm"),
};
