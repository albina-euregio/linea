import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { OptsHelper } from "./opts-helper";
import { i18n } from "../../i18n";

function dangerColor(danger: string) {
  const colorByDanger: Record<string, string> = {
    low: "#ccff66",
    moderate: "#ffff00",
    considerable: "#ff9900",
    high: "#ff0000",
    "very high": "#000000",
    unknown: "#ffffff",
  };
  return colorByDanger[danger] ?? colorByDanger.unknown;
}

export const opts_danger_rating_altitude: uPlot.Options = {
  ...OptsHelper.getDefaultOptions(),
  title: i18n.message("linea:dangerrating:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangerrating:yaxis:altitude")}`;
        OptsHelper.UpdateAxisLabels(
          u,
          labely1,
          "",
          u.bbox.left,
          u.bbox.width,
          "#000000",
          "#000000",
        );
      },
    ],
    draw: [
      (u: uPlot) => {
        const rawData = u.data as unknown as [
          number[],
          number[],
          string[],
          Array<{ lowerBound: number; upperBound: number }>,
        ];
        const timestamps = rawData[1];
        const dangerRatings = rawData[2];
        const layers = rawData[3];
        const bbox = u.bbox;

        const ctx = u.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
        ctx.clip();

        const dayWidthMs = 24 * 60 * 60 * 1000;

        for (let i = 0; i < timestamps.length; i++) {
          const x1 = u.valToPos(timestamps[i], "x", true);
          const x2 = u.valToPos(timestamps[i] + dayWidthMs, "x", true);
          const y1 = u.valToPos(layers[i].upperBound, "y", true);
          const y2 = u.valToPos(layers[i].lowerBound, "y", true);

          const x = x1;
          const y = Math.min(y1, y2);
          const w = Math.max(1, x2 - x1);
          const h = Math.abs(y2 - y1);

          if (y + h < bbox.top || y > bbox.top + bbox.height) {
            continue;
          }

          ctx.fillStyle = dangerColor(dangerRatings[i]);
          ctx.fillRect(x, y, w, h);

          if (w > 30 && h > 20) {
            ctx.fillStyle = dangerRatings[i] === "very high" ? "#fff" : "#000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "10px sans-serif";
            // ctx.fillText(dangerRatings[i].charAt(0).toUpperCase(), x + w / 2, y + h / 2);
          }
        }
        ctx.restore();
      },
    ],
  },
  legend: {
    show: false,
  },
  scales: {
    x: { ...timeScale },
    y: { auto: true },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
    },
  ],
  series: [
    {},
    { label: "Time", show: true },
    { label: "Danger", show: true },
    { label: "Layer", show: true },
  ],
  cursor: { show: true, drag: { x: true, y: true, uni: 50, dist: 10 } },
};
