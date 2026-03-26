import { i18n, type messagesEN_t } from "../i18n";
import { AbstractChart } from "./abstract-chart";
import { BulletinData } from "./datastore";
import {
  opts_danger_rating_micro_regions,
  opts_series_danger_rating_micro_regions,
} from "./series-options/danger-rating-micro-regions-opts";

export class DangerRatingMicroRegionsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.exportModal.legend = false;
  }

  async render(): Promise<void> {
    if (this.plot) {
      this.plot.destroy();
      this.plot = null;
    }
    if (this.container) {
      this.container.remove();
    }

    const bulletinData = new BulletinData(this.bulletins);
    const distribution = bulletinData.affectedMicroRegionsPerDangerRatingPerDay(
      this.getAttribute("region-code") ?? "all",
    );

    this.createPlot(opts_danger_rating_micro_regions, [distribution.timestamps]);

    type dangerRating = 1 | 2 | 3 | 4 | 5;

    const convert: Record<dangerRating, string> = {
      1: "low",
      2: "moderate",
      3: "considerable",
      4: "high",
      5: "very_high",
    };
    const colors: Record<dangerRating, { fill: string; stroke: string }> = {
      1: { stroke: "#7fbf00", fill: "rgba(204, 255, 102, 0.1)" },
      2: { stroke: "#b89b00", fill: "rgba(255, 255, 0, 0.1)" },
      3: { stroke: "#cc6f00", fill: "rgba(255, 153, 0, 0.1)" },
      4: { stroke: "#b00000", fill: "rgba(255, 0, 0, 0.1)" },
      5: { stroke: "#111111", fill: "rgba(0, 0, 0, 0.1)" },
    };

    const ratings: dangerRating[] = [1, 2, 3, 4, 5];
    for (const i of ratings) {
      this.addSeries(
        {
          ...opts_series_danger_rating_micro_regions,
          label: `${i} ${i18n.message(`linea:yearly:dangerratingdistribution:series:${convert[i]}` as messagesEN_t)}`,
          ...colors[i],
        },
        distribution.ratings[i],
      );
    }
  }
}

customElements.define("aws-danger-rating-micro-regions", DangerRatingMicroRegionsChart);
