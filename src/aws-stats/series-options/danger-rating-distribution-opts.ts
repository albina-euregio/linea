import uPlot from "uplot";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";

export const dangerDistributionOrder = [
  "low",
  "moderate",
  "considerable",
  "high",
  "very_high",
] as const;

export type DangerDistributionKey = (typeof dangerDistributionOrder)[number];

const dangerDistributionLabels: Record<(typeof dangerDistributionOrder)[number], string> = {
  low: `1 ${i18n.message("linea:yearly:dangerratingdistribution:series:low")}`,
  moderate: `2 ${i18n.message("linea:yearly:dangerratingdistribution:series:moderate")}`,
  considerable: `3 ${i18n.message("linea:yearly:dangerratingdistribution:series:considerable")}`,
  high: `4 ${i18n.message("linea:yearly:dangerratingdistribution:series:high")}`,
  very_high: `5 ${i18n.message("linea:yearly:dangerratingdistribution:series:very_high")}`,
};

export const dangerDistributionColors: Record<
  DangerDistributionKey,
  { stroke: string; fill: string }
> = {
  low: { stroke: "#7fbf00", fill: "rgba(204, 255, 102, 0.65)" },
  moderate: { stroke: "#b89b00", fill: "rgba(255, 255, 0, 0.65)" },
  considerable: { stroke: "#cc6f00", fill: "rgba(255, 153, 0, 0.65)" },
  high: { stroke: "#b00000", fill: "rgba(255, 0, 0, 0.65)" },
  very_high: { stroke: "#111111", fill: "rgba(0, 0, 0, 0.8)" },
};

export const opts_danger_rating_distribution: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  title: `${i18n.message("linea:yearly:dangerratingdistribution:title")}`,
  hooks: {
    drawAxes: [
      (u) => {
        const labely1 =
          i18n.message("linea:yearly:dangerratingdistribution:yaxis:percent") + " (%)";
        AwsStatsOptsHelper.UpdateAxisLabels(
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
  },
  scales: {
    x: {
      time: false,
      auto: false,
      range: [0.5, dangerDistributionOrder.length + 0.5],
    },
    y: {
      auto: true,
      range: [0, null],
    },
  },
  axes: [
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
      splits: dangerDistributionOrder.map((_, index) => index + 1),
      values: (_u, splits) =>
        splits.map((split) => {
          const idx = Math.round(split) - 1;
          const key = dangerDistributionOrder[idx];
          return key ? dangerDistributionLabels[key] : "";
        }),
    },
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
    },
  ],
  series: [{}],
  cursor: { show: false, drag: { x: false, y: false, uni: 50, dist: 10 } },
  legend: {
    show: false,
  },
};

export const opts_danger_rating_distribution_series: uPlot.Series = {
  width: 1,
  paths: uPlot.paths.bars!({
    size: [0.55, 100],
    align: 0,
    each(u, seriesIdx, idx, left, top, width, _height) {
      drawValuesToBars(u, seriesIdx, idx, left, top, width);
    },
  }),
  points: { show: false },
};

export const opts_danger_rating_distribution_reference_series: uPlot.Series = {
  ...opts_danger_rating_distribution_series,
  label: i18n.message("linea:yearly:dangerratingdistribution:series:reference"),
  stroke: "#7a7a7a",
  fill: "rgba(130, 130, 130, 0.35)",
  paths: uPlot.paths.bars!({
    size: [0.55, 100],
    align: 1,
    each(u, seriesIdx, idx, left, top, width, _height) {
      drawValuesToBars(u, seriesIdx, idx, left, top, width, "left");
    },
  }),
  points: { show: false },
};

function drawValuesToBars(
  u: uPlot,
  seriesIdx: number,
  idx: number,
  left: number,
  top: number,
  width: number,
  textAlign: CanvasTextAlign = "center",
) {
  const ctx = u.ctx;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "bottom";
  ctx.font = "12px Arial";

  const label = i18n.number(u.data[seriesIdx][idx]);
  const textArea = ctx.measureText(label);

  ctx.fillStyle = "#838383ce";
  const padding: [top: number, right: number, left: number, bottom: number] = [5, 2, 2, 1];
  ctx.fillRect(
    left + width / 2 - textArea.actualBoundingBoxLeft - padding[2],
    top - textArea.ideographicBaseline + padding[3],
    textArea.width + padding[1] + padding[2],
    -textArea.actualBoundingBoxDescent - textArea.actualBoundingBoxAscent - padding[0] - padding[3],
  );
  ctx.fillStyle = "black";
  ctx.fillText(label, left + width / 2, top);
}

export function getDangerDistributionSeries(rating: DangerDistributionKey): uPlot.Series {
  const color = dangerDistributionColors[rating];
  return {
    ...opts_danger_rating_distribution_series,
    label: dangerDistributionLabels[rating],
    stroke: color.stroke,
    fill: color.fill,
  };
}
