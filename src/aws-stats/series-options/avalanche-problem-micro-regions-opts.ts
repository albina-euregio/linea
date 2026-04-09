import uPlot from "uplot";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { LOADED_AVALANCHE_PROBLEM_ICONS } from "../../shared/avalanche-problem-icons";
import { DANGER_LEVEL_MAX_SIZE } from "../../shared/danger-level-icons";
import { AvalancheProblemMicroRegionsChart } from "../avalanche-problem-micro-regions-chart";

export const opts_avalanche_problem_micro_regions: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  padding: [20, 80, 0, 80],
  title: `${i18n.message("linea:yearly:avalancheproblemmicroregions:title")}`,
  hooks: {
    drawAxes: [
      (u) => {
        const labely1 = i18n.message(
          "linea:yearly:avalancheproblemmicroregions:yaxis:avalancheproblems",
        );
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
    draw: [
      (u: uPlot) => {
        for (
          let level = Math.ceil((u.scales.y.range as [number, number])?.[0] ?? 1);
          level <= Math.floor((u.scales.y.range as [number, number])?.[1] ?? 5);
          level++
        ) {
          const img = LOADED_AVALANCHE_PROBLEM_ICONS.get(
            AvalancheProblemMicroRegionsChart.avalancheProblemTypes[level - 1],
          );
          if (!img) {
            // TODO: implement fallback with label
            continue;
          }
          if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
            const calcIconSize = (36 / 200) * u.bbox.height;
            const iconSize = Math.min(calcIconSize, sourceSize, DANGER_LEVEL_MAX_SIZE);
            const posY = u.valToPos(level, "y", true);
            const posX = u.bbox.left - iconSize - 20;

            u.ctx.save();
            u.ctx.imageSmoothingEnabled = true;
            u.ctx.imageSmoothingQuality = "high";
            u.ctx.drawImage(
              img,
              posX,
              posY - iconSize / 2,
              (iconSize * img.naturalWidth) / img.naturalHeight,
              iconSize,
            );
            u.ctx.restore();
          }
        }
      },
    ],
  },
  scales: {
    x: timeScale,
    y: {
      range: [0.5, 5.5],
    },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
      splits: [1, 2, 3, 4, 5],
    },
  ],
  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};
