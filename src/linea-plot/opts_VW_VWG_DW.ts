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
  ctx.textBaseline = "top"; 

  const canvasWidth = u.ctx.canvas.width;
  const canvasHeight = u.ctx.canvas.height;
  const yPos = canvasHeight * 0.05;

  // Left Y-axis label
  const xPosY = u.bbox.left;
  ctx.textAlign = "left";
  ctx.fillStyle = "#00E2B6";
  ctx.fillText( 
    `${i18n.message("dialog:weather-station-diagram:parameter:VW")} (km/h)`,
        xPosY, 
        yPos
        );


  // Right Y-axis label 
  const xPosY2 = u.bbox.left + u.bbox.width;
  ctx.textAlign = "right";
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
      let validMin = Infinity;
      let validMax = -Infinity;
      
      // Only check series that use the 'y' scale
      for (let i = 1; i < u.data.length; i++) {
        // Skip series that don't use this scale
        if (u.series[i].scale !== 'y') continue;
        
        const series = u.data[i];
        for (let j = 0; j < series.length; j++) {
          const val = series[j];
          if (!isNaN(val) && val !== null) {
            validMin = Math.min(validMin, val);
            validMax = Math.max(validMax, val);
          }
        }
      }
      
      if (validMin === Infinity || validMax === -Infinity) {
        return [0, 100]; 
      }
      
      console.log('Valid data range:', validMin, 'to', validMax);
      return validMax > 100 ? [0, 120] : [0, 100];
    },
  },
  y2: {
    range: [0, 360],
  },
},
axes: [
  timeAxis,
  {
    scale: "y",
    side: 3,
    stroke: "#00E2B6",
    grid: {show: true},
    splits: (u) => {
      const max = u.scales.y.max;
      const useExtended = max > 100;
      const baseTicks = useExtended
        ? [0, 30, 60, 90, 120]
        : [0, 25, 50, 75, 100];
      return baseTicks;
    },
    values: (u, vals) => vals.map(v => v.toString()),
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
