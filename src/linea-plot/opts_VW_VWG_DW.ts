import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

/**
 * uPlot options for Windgeschwindigkeit [km/h] & Windrichtung [˚]
 */
export const opts_VW_VWG_DW: uPlot.Options = {
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
        const xPosY = canvasWidth * 0.075;
                        ctx.fillStyle = "#00E2B6";
        ctx.fillText(
          `${i18n.message("dialog:weather-station-diagram:parameter:VW")} (km/h)`,
          xPosY,
          yPos
        );

        // horizontal label for y2-axis
        const xPosY2 = canvasWidth * 0.9;
                        ctx.fillStyle = "#084D40";
        ctx.fillText(
          i18n.message("dialog:weather-station-diagram:parameter:DW"),
          xPosY2,
          yPos
        );

        // Draw reference line at 25 km/h (working group decision)
        const width = 1;
        const offset = (width % 2) / 2;
        const x0 = u.bbox.left;
        const y0 = u.valToPos(25, "y", true);
        const x1 = u.bbox.left + u.bbox.width;

        ctx.strokeStyle = "#000";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0 + offset, y0 + offset);
        ctx.lineTo(x1 + offset, y0 + offset);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      },
    ],
  },
  scales: {
    y: {
      range: (u, dataMin, dataMax) => {
        return dataMin < 0 || dataMax > 100 ? [0, 120] : [0, 100];
      },
    },
    y2: {
      range: [0, 360],
    },
  },
  axes: [
    timeAxis,
    {
      splits: (u) => {
        const min = u.scales.y.min;
        const max = u.scales.y.max;
        return min <= 0 && max >= 120
          ? [0, 30, 60, 90, 120]
          : [0, 25, 50, 75, 100];
      },
      stroke: "#00E2B6",
      scale: "y",
    },
    {
      splits: [0, 90, 180, 270, 360],
      stroke: "#084D40",
      values: ["N", "E", "S", "W", "N"],
      scale: "y2",
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

export const opts_VW: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:VW"),
  stroke: "#00E2B6",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_VW_MAX: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:VW_MAX"),
  stroke: "#00A484",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "km/h"),
};

export const opts_DW: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:DW"),
  stroke: "#084D40",
  paths: () => null,
  points: {
    space: 0,
    fill: "#084D40",
    size: 4,
  },
  scale: "y2",
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "°"),
};
