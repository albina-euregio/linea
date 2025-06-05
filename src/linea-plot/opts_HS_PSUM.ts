import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";

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
        ctx.font = "bold 0.9vm sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const canvasWidth = u.ctx.canvas.width;
        const canvasHeight = u.ctx.canvas.height;
        const yPos = canvasHeight * 0.05;

        // horizontal label for y-axis
        const xPosY = canvasWidth * 0.1;
        ctx.fillStyle = "#08519C";
        ctx.fillText("Schneehöhe (cm)", xPosY, yPos);

        // horizontal label for y2-axis
        const xPosY2 = canvasWidth * 0.9;
        ctx.fillStyle = "#6aafd5";
        ctx.fillText("Niederschlag (mm)", xPosY2, yPos);

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
    {
      values: [
        [31536000, "{YYYY}", null, null, null, null, null, null, 1],
        [2419200, "{MMM}", "\n{YYYY}", null, null, null, null, null, 1],
        [86400, "{DD}. {MMM}", "\n{YYYY}", null, null, null, null, null, 1], // e.g. 29. May
        [
          3600,
          "{HH}:{mm}",
          "\n{DD}. {MMM} {YY}",
          null,
          "\n{DD}. {MMM}",
          null,
          null,
          null,
          1,
        ],
        [
          60,
          "{HH}:{mm}",
          "\n{DD}. {MMM} {YY}",
          null,
          "\n{DD}. {MMM}",
          null,
          null,
          null,
          1,
        ],
        [
          1,
          ":{ss}",
          "\n{DD}. {MMM} {YY} {HH}:{mm}",
          null,
          "\n{DD}. {MMM} {HH}:{mm}",
          null,
          "\n{HHh}:{mm}",
          null,
          1,
        ],
      ],
      grid: {
        show: false,
      },
    },
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
      name: "Time",
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
    {
      label: "Schneehöhe",
      stroke: "#08519C",
      scale: "y",
      width: 2,
      value: (u, v) => (v != null ? v.toFixed(1) + " mm" : "-"),
    },
    {
      label: "Niederschlag",
      stroke: "#6aafd5",
      fill: "rgba(106, 175, 213, 0.3)",
      scale: "y2",
      width: 1,
      value: (u, v) => (v != null ? v.toFixed(1) + " cm" : "-"),
    },
  ],
};
