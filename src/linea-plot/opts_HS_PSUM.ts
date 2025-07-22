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
         ctx.font = "bold 1.4vw sans-serif";
         ctx.textAlign = "center";
         ctx.textBaseline = "bottom";
                        
         const canvasHeight = u.ctx.canvas.height;
         const yPos = canvasHeight * 0.1;

         const plotLeft = u.bbox.left;
         const plotRight = u.bbox.left + u.bbox.width;

       // Horizontal label for y-axis (align with left axis)
                        ctx.fillStyle = "#08519C";
                        ctx.textAlign = "left"; // Ensure left alignment
                        ctx.fillText(`${i18n.message("dialog:weather-station-diagram:parameter:HS")} (cm)`,
                        plotLeft, yPos);

      // Horizontal label for y2-axis (align with right axis)  
                        ctx.fillStyle = "#6aafd5";
                        ctx.textAlign = "right"; // Ensure right alignment
                        ctx.fillText(`${i18n.message("dialog:weather-station-diagram:parameter:PSUM")} (mm)`,
                        plotRight, yPos);
                        ctx.restore();
      },
    ],
  },
  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMin < -0 || dataMax > 250 ? [0, 500] : [0, 250];
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
