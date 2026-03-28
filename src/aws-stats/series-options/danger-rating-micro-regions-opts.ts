import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { i18n } from "../../i18n";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";

const opts_series_danger_rating_micro_regions = {
  scale: "y",
  width: 2.5,
  value: (_u: uPlot, v: number) => (v === null || Number.isNaN(v) ? "-" : i18n.number(v, {}, "%")),
};

/**
 * uPlot options for avalanche activity
 */
export const opts_danger_rating_micro_regions: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  title: i18n.message("linea:dangerratingmicroregions:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangerratingmicroregions:yaxis:dangerrating")} (%)`;

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
  legend: {
    show: true,
    live: true,
    fill: (u: any, seriesIdx: number) => u.series[seriesIdx].stroke(u, seriesIdx),
    markers: {
      fill: (u: any, seriesIdx: number) =>
        u.series[seriesIdx].stroke(u, seriesIdx) ?? u.series[seriesIdx].stroke(u, seriesIdx),
    },
  } as any,
  scales: {
    x: timeScale,
    y: {
      range: [0, 100],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
      splits: [0, 20, 40, 60, 80, 100],
    },
  ],

  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
    {
      ...opts_series_danger_rating_micro_regions,
      label: `1 ${i18n.message(`linea:yearly:dangerratingdistribution:series:low`)}`,
      stroke: "#7fbf00",
      fill: "rgba(204, 255, 102, 0.1)",
    },
    {
      ...opts_series_danger_rating_micro_regions,
      label: `2 ${i18n.message(`linea:yearly:dangerratingdistribution:series:moderate`)}`,
      stroke: "#b89b00",
      fill: "rgba(255, 255, 0, 0.1)",
    },
    {
      ...opts_series_danger_rating_micro_regions,
      label: `3 ${i18n.message(`linea:yearly:dangerratingdistribution:series:considerable`)}`,
      stroke: "#cc6f00",
      fill: "rgba(255, 153, 0, 0.1)",
    },
    {
      ...opts_series_danger_rating_micro_regions,
      label: `4 ${i18n.message(`linea:yearly:dangerratingdistribution:series:high`)}`,
      stroke: "#b00000",
      fill: "rgba(255, 0, 0, 0.1)",
    },
    {
      ...opts_series_danger_rating_micro_regions,
      label: `5 ${i18n.message(`linea:yearly:dangerratingdistribution:series:very_high`)}`,
      stroke: "#111111",
      fill: "rgba(0, 0, 0, 0.1)",
    },
  ],
};
