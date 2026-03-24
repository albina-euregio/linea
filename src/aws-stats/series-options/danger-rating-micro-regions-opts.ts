import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { i18n } from "../../i18n";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";

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
        },
    ],

    series: [
        {
            label: i18n.message("linea:axis:time"),
            value: "{DD}. {MMM}. {YYYY} {HH}:{mm}",
        },
    ],
};

export const opts_series_danger_rating_micro_regions = {
    scale: "y",
    width: 2.5,
    value: (_u: uPlot, v: number) => (v === null || Number.isNaN(v) ? "-" : i18n.number(v, {}, "%")),
};
