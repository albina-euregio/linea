import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";

// Create state variable to control shading
export const showSurfaceHoar = { value: true };

/**
 * uPlot options for Temperature, Dew Point & Snow Surface Temperature
 */
export const opts_TA_TD_TSS: uPlot.Options = {
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
      values: (u, seriesIdx, values) => {
        let result = {};
        u.series.forEach((s, i) => {
          if (i === 0) {
            result[s.label || s.name] = values[i];
          } else {
            result[s.label] = values[i] + (s.unit ? ` ${s.unit}` : "");
          }
        });
        return result;
      },
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
        ctx.fillStyle = "#DE2D26";
        ctx.textAlign = "left"; // Ensure left alignment
        ctx.fillText(`${i18n.message("dialog:weather-station-diagram:unit:temperature")} (°C)`, 
              plotLeft, yPos);

        // Horizontal label for y2-axis (align with right axis)  
        ctx.fillStyle = "#6aafd5";
        ctx.textAlign = "right"; // Ensure right alignment
        ctx.fillText(`${i18n.message("dialog:weather-station-diagram:parameter:TD")} (°C)`,
              plotRight, yPos);

        // Draw reference line at 0°C
        const width = 1;
        const offset = (width % 2) / 2;
        const x0 = u.bbox.left;
        const y0 = u.valToPos(0, "y", true);
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

        // Only draw shaded regions if showSurfaceHoar is true
        if (showSurfaceHoar.value) {
          ctx.save();
          ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
          ctx.clip();
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)";

          let from = 0,
            to = 0;

          for (let i = 0; i < u.data[0].length; i++) {
            let td = u.data[2][i];
            let tss = u.data[3][i];

            if (td < 0 && tss < td) {
              let xVal = u.data[0][i];
              if (from === 0) from = xVal;
              to = xVal;
            } else if (from !== 0) {
              let x0 = u.valToPos(from, "x", true);
              let x1 = u.valToPos(to, "x", true);
              ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
              from = 0;
            }
          }

          // If region extends to end
          if (from !== 0) {
            let x0 = u.valToPos(from, "x", true);
            let x1 = u.valToPos(to, "x", true);
            ctx.fillRect(x0, u.bbox.top, x1 - x0, u.bbox.height);
          }

          ctx.restore();
        }
      },
    ],
  },

  scales: {
  y: {
    range: (u, dataMin, dataMax) => {
      return (dataMin < -30 || dataMax > 10) ? [-30, 30] : [-30, 10];
    },
  }
},

  axes: [
    timeAxis,
    {
    scale: "y",
    side: 3,
    stroke: "#DE2D26",
    grid: { show: true },
    splits: (u) => {
      const min = u.scales.y.min;
      const max = u.scales.y.max;
      const useExtended = max > 15;
      const baseTicks = useExtended
        ? [-30, -20, -10, 0, 10, 20, 30]
        : [-30, -20, -10, 0, 10];
      return baseTicks;
    },
      values: (u, vals) => vals.map(v => v.toString()),
  },
  {
    scale: "y",
    side: 1,
    stroke: "#6aafd5",
    grid: { show: false },
    show: true,
    // mirror axis
      values: (u, vals) => vals.map(v => v.toString()),
  }
],

  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

export const opts_TA: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:unit:temperature"),
  stroke: "#DE2D26",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, {}, "°C"),
};

export const opts_TD: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:TD"),
  stroke: "#6aafd5",
  scale: "y2",
  width: 2,
  value: (u, v) => i18n.number(v, {}, "°C"),
};

export const opts_TSS: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:TSS"),
  stroke: "#FC9272",
  scale: "y",
  width: 2,
  value: (u, v) => i18n.number(v, {}, "°C"),
};
