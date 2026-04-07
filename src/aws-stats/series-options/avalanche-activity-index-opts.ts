import uPlot from "uplot";
import { dailyBarChartTimeAxis as dailyBarChartTimeAxis, dailyBarChartTimeScale, timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { i18n } from "../../i18n";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import type { SplitOptions } from "../../shared/opts-helper";

/**
 * uPlot options for avalanche activity
 */
export const opts_avalanche_activity_index: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  title: i18n.message("linea:avalancheactivityindex:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:avalancheactivityindex:yaxis:aai")}`;
        var labely2 = `${i18n.message("linea:avalancheactivityindex:yaxis:avalanchecount")}`;

        AwsStatsOptsHelper.UpdateAxisLabels(
          u,
          labely1,
          labely2,
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
    x: dailyBarChartTimeScale,
    y: {
      range: (_u, _dataMin, dataMax) => {
        if (!dataMax || dataMax <= 15) return [0, 15];
        if (dataMax <= 60) return [0, 30];
        if (dataMax <= 60) return [0, 60];
        if (dataMax <= 90) return [0, 90];
        if (dataMax <= 120) return [0, 120];
        if (dataMax <= 150) return [0, 150];
        if (dataMax <= 180) return [0, 180];
        return [0, 210];
      },
    },
    y2: {
      range: (_u, _dataMin, dataMax) => {
        if (!dataMax || dataMax <= 15) return [0, 15];
        if (dataMax <= 60) return [0, 30];
        if (dataMax <= 60) return [0, 60];
        if (dataMax <= 90) return [0, 90];
        if (dataMax <= 120) return [0, 120];
        if (dataMax <= 150) return [0, 150];
        if (dataMax <= 180) return [0, 180];
        return [0, 210];
      },
    },
  },

  axes: [
    dailyBarChartTimeAxis,
    {
      scale: "y",
      splits: (u) => {
        return AwsStatsOptsHelper.getSplits({
          uplot: u,
          mins: [0, 0, 0, 0, 0, 0, 0, 0],
          maxs: [15, 30, 60, 90, 120, 150, 180, 210],
          splits: [
            [0, 5, 10, 15],
            [0, 10, 20, 30],
            [0, 20, 40, 60],
            [0, 30, 60, 90],
            [0, 40, 80, 120],
            [0, 50, 100, 150],
            [0, 60, 120, 180],
            [0, 70, 140, 210],
          ],
          splitcount: 9,
        } as SplitOptions);
      },
    },
    {
      scale: "y2",
      side: 1,
      splits: (u) => {
        return AwsStatsOptsHelper.getSplits(
          {
            uplot: u,
            mins: [0, 0, 0, 0, 0, 0, 0, 0],
            maxs: [15, 30, 60, 90, 120, 150, 180, 210],
            splits: [
              [0, 5, 10, 15],
              [0, 10, 20, 30],
              [0, 20, 40, 60],
              [0, 30, 60, 90],
              [0, 40, 80, 120],
              [0, 50, 100, 150],
              [0, 60, 120, 180],
              [0, 70, 140, 210],
            ],
            splitcount: 9,
          } as SplitOptions,
          "y2",
        );
      },
    },
  ],
  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
    {
      label: i18n.message("linea:avalancheactivityindex:series:aai"),
      stroke: "#799418",
      fill: "#b4d4414f",
      scale: "y",
      width: 1.5,
    },
    {
      scale: "y2",
      points: { show: false },
      paths: uPlot.paths.bars!({ size: [0.4, 100], align: -1, radius: 0 }),
      label: i18n.message("linea:avalancheactivityindex:series:avalanchestotal"),
      stroke: "#c408dd",
      fill: "#c408dd62",
    },
    {
      scale: "y2",
      points: { show: false },
      paths: uPlot.paths.bars!({ size: [0.4, 100], align: 1, radius: 0 }),
      label: i18n.message("linea:avalancheactivityindex:series:avalanches:spontaneous"),
      stroke: "#8727b3",
      fill: "#8727b462",
    },
    {
      scale: "y2",
      points: { show: false },
      paths: uPlot.paths.bars!({ size: [0.4, 100], align: 1, radius: 0 }),
      label: i18n.message("linea:avalancheactivityindex:series:avalanches:artificial"),
      stroke: "#081ddd",
      fill: "#081ddd62",
    },
    {
      scale: "y2",
      points: { show: false },
      paths: uPlot.paths.bars!({ size: [0.4, 100], align: 1, radius: 0 }),
      label: i18n.message("linea:avalancheactivityindex:series:avalanches:unknown"),
      stroke: "#08bddd",
      fill: "#08bddd62",
    },
  ],
};
