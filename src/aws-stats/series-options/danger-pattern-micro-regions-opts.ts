import uPlot from "uplot";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";

export const opts_danger_patterns_micro_regions: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  padding: [20, 80, 0, 0],
  title: `${i18n.message("linea:yearly:dangerpatternmicroregions:title")}`,
  hooks: {
    drawAxes: [
      (u) => {
        const labely1 = i18n.message("linea:yearly:dangerpatternmicroregions:yaxis:dangerpatterns");
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
    x: timeScale,
    y: {
      range: [0.4, 10.5],
    },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
      splits: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      values: ["DP1", "DP2", "DP3", "DP4", "DP5", "DP6", "DP7", "DP8", "DP9", "DP10"],
    },
  ],
  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};
