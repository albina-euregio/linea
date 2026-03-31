import uPlot from "uplot";
import { timeAxis, timeScale } from "../../linea-plot/opts_time_axis";
import { AwsStatsOptsHelper } from "./aws-stats-opts-helper";
import { i18n } from "../../i18n";
import icon1 from "../../assets/Icon-Avalanche-Danger-Level-Dry-Snow-1-EAWS.svg";
import icon2 from "../../assets/Icon-Avalanche-Danger-Level-Dry-Snow-2-EAWS.svg";
import icon3 from "../../assets/Icon-Avalanche-Danger-Level-Dry-Snow-3-EAWS.svg";
import icon4 from "../../assets/Icon-Avalanche-Danger-Level-Dry-Snow-4-EAWS.svg";
import icon5 from "../../assets/Icon-Avalanche-Danger-Level-Dry-Snow-5-EAWS.svg";

const iconUrls = [icon1, icon2, icon3, icon4, icon5];
const loadedIcons = new Map<number, HTMLImageElement>();
const maxIconSize = 80; // Maximum size for the icons in pixels
const iconPadding = 4;

function preloadIcons() {
  iconUrls.forEach((url, index) => {
    const img = new Image();
    img.src = url;
    loadedIcons.set(index + 1, img);
  });
}
preloadIcons();

export const opts_danger_rating: uPlot.Options = {
  ...AwsStatsOptsHelper.getDefaultOptions(),
  title: i18n.message("linea:dangerrating:title"),
  hooks: {
    drawAxes: [
      (u) => {
        var labely1 = `${i18n.message("linea:dangerrating:yaxis:dangerrating")}`;
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
        for (let level = 1; level <= 5; level++) {
          const img = loadedIcons.get(level);
          if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
            const calcIconSize = (36 / 200) * u.bbox.height;
            const iconSize = Math.min(calcIconSize, sourceSize, maxIconSize);
            const posY = u.valToPos(level, "y", true);
            const posX = u.bbox.left - iconSize - iconPadding;

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
    x: { ...timeScale },
    y: {
      range: [0.6, 5.4],
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
    },
  ],
  series: [{}],
  cursor: { show: true, drag: { x: true, y: true, uni: 50, dist: 10 } },
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
