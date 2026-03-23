import uPlot from "uplot";
import { OptsHelper } from "./opts-helper";
import { i18n } from "../../i18n";

export const dangerDistributionOrder = [
    "low",
    "moderate",
    "considerable",
    "high",
    "very_high"
] as const;

export type DangerDistributionKey = (typeof dangerDistributionOrder)[number];

const dangerDistributionLabels: Record<(typeof dangerDistributionOrder)[number], string> = {
    low: "1 Low",
    moderate: "2 Moderate",
    considerable: "3 Considerable",
    high: "4 High",
    very_high: "5 Very High"
};

export const dangerDistributionColors: Record<DangerDistributionKey, { stroke: string; fill: string }> = {
    low: { stroke: "#7fbf00", fill: "rgba(204, 255, 102, 0.65)" },
    moderate: { stroke: "#b89b00", fill: "rgba(255, 255, 0, 0.65)" },
    considerable: { stroke: "#cc6f00", fill: "rgba(255, 153, 0, 0.65)" },
    high: { stroke: "#b00000", fill: "rgba(255, 0, 0, 0.65)" },
    very_high: { stroke: "#111111", fill: "rgba(0, 0, 0, 0.8)" },
};

export const opts_danger_rating_distribution: uPlot.Options = {
    ...OptsHelper.getDefaultOptions(),
    title: `${i18n.message("chart:dangerrating:title")} Distribution`,
    hooks: {
        drawAxes: [
            (u) => {
                const labely1 = "Count";
                OptsHelper.UpdateAxisLabels(u, labely1, "", u.bbox.left, u.bbox.width, "#000000", "#000000");
            },
        ],
    },
    scales: {
        x: {
            auto: false,
            range: [0.5, dangerDistributionOrder.length + 0.5],
        },
        y: {
            auto: false,
            range: [0, 65],
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
    cursor: { show: true, drag: { x: false, y: false, uni: 50, dist: 10 } },
};

export const opts_danger_rating_distribution_series: uPlot.Series = {
    label: "Count",
    stroke: "#aa2e00",
    fill: "rgba(170, 46, 0, 0.35)",
    width: 1,
    points: { show: false },
    paths: uPlot.paths.bars!({ size: [0.7, 100] }),
};

export function getDangerDistributionSeries(rating: DangerDistributionKey): uPlot.Series {
    const color = dangerDistributionColors[rating];
    return {
        ...opts_danger_rating_distribution_series,
        label: dangerDistributionLabels[rating],
        stroke: color.stroke,
        fill: color.fill,
    };
}
