import uPlot from "uplot";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n, type messagesEN_t } from "../../i18n";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";

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
      values: ["persistent_weak_layer", "new_snow", "wind_slab", "wet_snow", "gliding_snow"].map(
        (v) =>
          i18n.message(`linea:yearly:avalancheproblemmicroregions:series:${v}` as messagesEN_t),
      ),
    },
  ],
  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
  ],
};
