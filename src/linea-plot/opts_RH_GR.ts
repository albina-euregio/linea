import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

/**
 * uPlot options for Relative Luftfeuchtigkeit [%] & Globalstrahlung [W/m²]
 */
export const opts_RH_GR: uPlot.Options = {
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
  ctx.textBaseline = "top"; 

  const bboxHeight = u.bbox.height;
  const yPos = bboxHeight * 0.08;

  // Left Y-axis label
  const xPosY = u.bbox.left;
  ctx.textAlign = "left";
  ctx.fillStyle = "#6aafd5";
  ctx.fillText( 
    `${i18n.message("dialog:weather-station-diagram:parameter:RH")} (%)`,
        xPosY, 
        yPos
        );


  // Right Y-axis label 
  const xPosY2 = u.bbox.left + u.bbox.width;
  ctx.textAlign = "right";
  ctx.fillStyle = "#DE2D26";
  ctx.fillText(
      `${i18n.message("dialog:weather-station-diagram:parameter:ISWR")} (W/m²)`,
        xPosY2, 
        yPos
        );
                        ctx.restore();
      },
    ],
  },

  scales: {
    y: {
      range: [0, 100],
    },
    y2: {
      range: [0, 1200],
    },
  },
  axes: [
    timeAxis,
    {
      scale: "y",
      splits: [0, 25, 50, 75, 100],
      stroke: "#6aafd5",
      grid: {
        show: false,
      },
    },
    {
      scale: "y2",
      splits: [0, 300, 600, 900, 1200],
      stroke: "#DE2D26",
      side: 1,
      grid: {
        show: true,
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

export const opts_RH: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:RH"),
  stroke: "#6aafd5",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "%"),
};

export const opts_ISWR: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:ISWR"),
  stroke: "#DE2D26",
  fill: "rgba(255,0,0,0.1)",
  scale: "y2",
  width: 1,
  value: (u, v) => i18n.number(v, { maximumFractionDigits: 0 }, "W/m²"),
};
