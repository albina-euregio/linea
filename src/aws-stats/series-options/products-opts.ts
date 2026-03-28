import uPlot from "uplot";
const { bars } = uPlot.paths;
import { dailyBarChartTimeScale, timeAxis } from "../../linea-plot/opts_time_axis";
import { i18n } from "../../i18n";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import {
  getStackedOpts as getReusableStackedOpts,
  stack2 as reusableStack2,
  type Stack2Series,
  type StackedData,
} from "../../shared/stacked-series-opts";

export const opts_series_products = {
  scale: "y",
  paths: bars!({ size: [0.99, 100], radius: 0 }),
  points: { show: false },
};

/**
 * uPlot options for avalanche activity
 */
export const opts_products_bars: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  cursor: {
    points: {
      show: false,
    },
  },
  title: i18n.message("linea:yearly:products:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:yearly:products:yaxis:products")}`;

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
    x: dailyBarChartTimeScale,
    y: {
      auto: true,
      range: [0, null],
    },
  },

  axes: [
    timeAxis,
    {
      scale: "y",
    },
  ],
  series: [
    {
      label: i18n.message("linea:axis:time"),
      value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
    },
    {
      ...opts_series_products,
      label: `${i18n.message(`linea:yearly:products:series:bulletins`)}`,
      stroke: "#0400ff",
      fill: "#4240ca52",
    },
    {
      ...opts_series_products,
      label: `${i18n.message(`linea:yearly:products:series:fieldtrainings`)}`,
      stroke: "#176929",
      fill: "#41995483",
    },
    {
      ...opts_series_products,
      label: `${i18n.message(`linea:yearly:products:series:virtualtrainings`)}`,
      stroke: "#23bd23",
      fill: "rgba(100, 196, 81, 0.62)",
    },
  ],
};

export function getStackedOpts(
  opts: uPlot.Options,
  data: StackedData,
  interp?: (input: StackedData) => StackedData,
): { opts: uPlot.Options; data: StackedData } {
  return getReusableStackedOpts(opts, data, interp, (value: number | null) =>
    value === null || Number.isNaN(value) ? "-" : i18n.number(value),
  );
}

export function stack2(
  series: Stack2Series[],
  omit: (seriesIdx: number) => boolean = (_seriesIdx: number) => false,
): {
  data: Array<Array<number | null>>;
  bands: Array<{ series: [number, number]; dir: 1 | -1 }>;
} {
  return reusableStack2(series, omit);
}
