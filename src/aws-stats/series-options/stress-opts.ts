import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { opts_danger_rating } from "./danger-rating-opts";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";
import { DANGER_LEVEL_MAX_SIZE, LOADED_DANGER_LEVEL_ICONS } from "../../shared/danger-level-icons";

export const opts_stress: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  title: i18n.message("linea:dangerrating:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangerrating:yaxis:dangerrating")}`;
        var labely2 = `${i18n.message("linea:stress:yaxis:stress")}`;
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
    draw: [
      (u: uPlot) => {
        for (let level = 1; level <= 5; level++) {
          const img = LOADED_DANGER_LEVEL_ICONS.get(level);
          if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
            const calcIconSize = (36 / 200) * u.bbox.height;
            const iconSize = Math.min(calcIconSize, sourceSize, DANGER_LEVEL_MAX_SIZE);
            const posY = u.valToPos(level, "y", true);
            const posX = u.bbox.left - iconSize - 4;

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
  ...opts_danger_rating,
  scales: {
    x: { ...timeScale },
    y: {
      range: [0.6, 5.4],
    },
    y2: {
      range: [0, 100],
    },
  },
  axes: [
    timeAxis,
    {
      stroke: "#333",
      grid: { stroke: "#e5e5e5" },
      ticks: { stroke: "#333" },
      splits: [1, 2, 3, 4, 5],
      label: "", // Remove text labels since we're using icons
      scale: "y",
    },
  ],
  series: [{}],
  cursor: { show: true, drag: { x: true, y: true, uni: 50, dist: 10 } },
};

export const opts_stress_danger_rating_series_all: uPlot.Series = {
  stroke: "#000000b2",
  scale: "y",
  width: 1.5,
  label: i18n.message("linea:dangerrating:series:dangerrating"),
};

export const opts_stress_series_base: uPlot.Series = {
  stroke: "#4108dd69",
  scale: "y2",
  width: 1.5,
};
