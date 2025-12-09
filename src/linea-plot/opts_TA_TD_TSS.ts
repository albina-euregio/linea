import type uPlot from "uplot";
import { cursorOpts } from "./cursorOpts";
import { timeAxis } from "./timeAxisOpts";
import { i18n } from "../i18n";
import { OptsHelper } from "./optsHelper";

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
    fill: (u: any, seriesIdx: number) => u.series[seriesIdx].stroke(u, seriesIdx),
    markers: {
      fill: (u: any, seriesIdx: number) =>
        u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
      values: (u: any, seriesIdx: number, values: any) => {
        let result: any = {};
        u.series.forEach((s: any, i: number) => {
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
        ctx.textBaseline = "top";

        const canvasHeight = u.ctx.canvas.height;
        var labely1 = `${i18n.message("dialog:weather-station-diagram:unit:temperature")} (°C)`;
        var labely2 = `${i18n.message("dialog:weather-station-diagram:parameter:TD")} (°C)`;
        var labelColor1 = "#DE2D26";
        var labelColor2 = "#6aafd5";

        OptsHelper.UpdateAxisLabels(
          ctx,
          labely1,
          labely2,
          u.bbox.left,
          u.bbox.width,
          canvasHeight,
          labelColor1,
          labelColor2,
        );

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
      },
    ],
  },

  scales: {
    y: {
      range: (u) => {
        let validMin = Infinity;
        let validMax = -Infinity;

        for (let i = 1; i < u.data.length; i++) {
          const series = u.data[i];
          for (let j = 0; j < series.length; j++) {
            const val = series[j] as number;
            if (!isNaN(val) && val !== null) {
              validMin = Math.min(validMin, val);
              validMax = Math.max(validMax, val);
            }
          }
        }

        if (validMin === Infinity || validMax === -Infinity) {
          return [-30, 10];
        }
        return validMin < -30 || validMax > 10 ? [-30, 30] : [-30, 10];
      },
    },

    yhidden: {
      range: [0, 1],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      side: 3,
      stroke: "#DE2D26",
      grid: { show: true },
      splits: (u) => {
        const max = u.scales.y.max ?? 0;
        const useExtended = max > 10;
        const baseTicks = useExtended ? [-30, -20, -10, 0, 10, 20, 30] : [-30, -20, -10, 0, 10];
        return baseTicks;
      },

      values: (u, vals) => vals.map((v) => v.toString()),
    },
    {
      scale: "y",
      side: 1,
      stroke: "#6aafd5",
      grid: {
        show: false,
      },
      values: (u, vals) => vals.map((v) => v.toString()),
    },
    {
      scale: "yhidden",
      show: false,
    },
  ],

  series: [
    {
      label: i18n.message("dialog:weather-station-diagram:unit:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};

const createSeries = (labelKey: any, color: string): uPlot.Series => ({
  label: i18n.message(labelKey),
  stroke: color,
  scale: "y",
  width: 2,
  spanGaps: false,
  value: (u, v) => (v === null || Number.isNaN(v) ? "-" : i18n.number(v, {}, "°C")),
});

export const opts_TA = createSeries("dialog:weather-station-diagram:unit:temperature", "#DE2D26");
export const opts_TD = createSeries("dialog:weather-station-diagram:parameter:TD", "#6aafd5");
export const opts_TSS = createSeries("dialog:weather-station-diagram:parameter:TSS", "#FC9272");

export const opts_SurfaceHoar: uPlot.Series = {
  label: i18n.message("dialog:weather-station-diagram:parameter:SH:potential"),
  width: 2,
  scale: "yhidden",
  spanGaps: false,
  fill: "rgba(1, 0, 0, 0.1)",
  stroke: "rgba(0, 0, 0, 0.1)",
  value: (u, v) =>
    v == null
      ? "-"
      : v > 0
        ? i18n.message("dialog:weather-station-diagram:parameter:SH:present")
        : i18n.message("dialog:weather-station-diagram:parameter:SH:present:not"),
};
