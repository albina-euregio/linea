import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";

export const opts_danger_source_variants_matrix_parameter: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  padding: [20, 20, 0, 30],
  scales: {
    x: { ...timeScale },
    y: {
      range: [0, 100],
    },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
    },
  ],
  series: [{}],
  cursor: { show: true, drag: { x: true, y: true, uni: 50, dist: 10 } },
};

export const opts_danger_source_variants_matrix_parameter_frequency_value: uPlot.Options = {
  ...opts_danger_source_variants_matrix_parameter,
  title: i18n.message("linea:dangersourcevariants:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangersourcevariants:yaxis:frequencyvalue")}`;
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
      (u) => {
        const ctx = u.ctx;
        const { left, width } = u.bbox;
        ctx.save();
        const height = u.valToPos(0, "y", true) - u.valToPos(25, "y", true);
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(left, u.valToPos(100, "y", true), width, height);
        ctx.fillStyle = "rgba(226, 83, 0, 0.22)";
        ctx.fillRect(left, u.valToPos(75, "y", true), width, height);
        ctx.fillStyle = "rgba(194, 248, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(50, "y", true), width, height);
        ctx.fillStyle = "rgba(0, 160, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(25, "y", true), width, height);
        ctx.restore();
      },
    ],
  },
  axes: [
    timeAxis,
    {
      ...opts_danger_source_variants_matrix_parameter.axes![1],
      splits: [12.5, 37.5, 62.5, 87.5],
      values: [
        i18n.message("linea:dangersourcevariants:frequency:none"),
        i18n.message("linea:dangersourcevariants:frequency:few"),
        i18n.message("linea:dangersourcevariants:frequency:some"),
        i18n.message("linea:dangersourcevariants:frequency:many"),
      ],
    },
  ],
};

export const opts_danger_source_variants_matrix_parameter_avalanche_size_value: uPlot.Options = {
  ...opts_danger_source_variants_matrix_parameter,
  title: i18n.message("linea:dangersourcevariants:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangersourcevariants:yaxis:avalanchesizevalue")}`;
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
      (u) => {
        const ctx = u.ctx;
        const { left, width } = u.bbox;
        ctx.save();
        const height = u.valToPos(0, "y", true) - u.valToPos(20, "y", true);
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(left, u.valToPos(100, "y", true), width, height);
        ctx.fillStyle = "rgba(226, 64, 0, 0.22)";
        ctx.fillRect(left, u.valToPos(80, "y", true), width, height);
        ctx.fillStyle = "rgba(209, 112, 0, 0.25)";
        ctx.fillRect(left, u.valToPos(60, "y", true), width, height);
        ctx.fillStyle = "rgba(194, 248, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(40, "y", true), width, height);
        ctx.fillStyle = "rgba(0, 160, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(20, "y", true), width, height);
        ctx.restore();
      },
    ],
  },
  axes: [
    timeAxis,
    {
      ...opts_danger_source_variants_matrix_parameter.axes![1],
      splits: [10, 30, 50, 70, 90],
      values: [
        i18n.message("linea:dangersourcevariants:avalanchesize:small"),
        i18n.message("linea:dangersourcevariants:avalanchesize:medium"),
        i18n.message("linea:dangersourcevariants:avalanchesize:large"),
        i18n.message("linea:dangersourcevariants:avalanchesize:very_large"),
        i18n.message("linea:dangersourcevariants:avalanchesize:extreme"),
      ],
    },
  ],
};

export const opts_danger_source_variants_matrix_parameter_stability_class_value: uPlot.Options = {
  ...opts_danger_source_variants_matrix_parameter,
  title: i18n.message("linea:dangersourcevariants:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangersourcevariants:yaxis:snowpackstabilityvalue")}`;
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
      (u) => {
        const ctx = u.ctx;
        const { left, width } = u.bbox;
        ctx.save();
        const height = u.valToPos(0, "y", true) - u.valToPos(25, "y", true);
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(left, u.valToPos(100, "y", true), width, height);
        ctx.fillStyle = "rgba(226, 83, 0, 0.22)";
        ctx.fillRect(left, u.valToPos(75, "y", true), width, height);
        ctx.fillStyle = "rgba(194, 248, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(50, "y", true), width, height);
        ctx.fillStyle = "rgba(0, 160, 0, 0.1)";
        ctx.fillRect(left, u.valToPos(25, "y", true), width, height);
        ctx.restore();
      },
    ],
  },
  axes: [
    timeAxis,
    {
      ...opts_danger_source_variants_matrix_parameter.axes![1],
      splits: [12.5, 37.5, 62.5, 87.5],
      values: [
        i18n.message("linea:dangersourcevariants:stabilityclass:good"),
        i18n.message("linea:dangersourcevariants:stabilityclass:fair"),
        i18n.message("linea:dangersourcevariants:stabilityclass:poor"),
        i18n.message("linea:dangersourcevariants:stabilityclass:verypoor"),
      ],
    },
  ],
};

export const opts_danger_rating_series_base: uPlot.Series = {
  stroke: "#4108dd69",
  scale: "y",
  width: 1.5,
};

export const opts_danger_rating_series_all: uPlot.Series = {
  ...opts_danger_rating_series_base,
  label: i18n.message("linea:dangerrating:series:dangerrating"),
};
