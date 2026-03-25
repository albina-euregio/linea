import { AbstractChart } from "./abstract-chart";
import { BulletinData } from "./datastore";
import {
  getStackedOpts,
  opts_danger_rating_micro_regions_bars,
} from "./series-options/danger-rating-micro-regions-bars-opts";

export class DangerRatingMicroRegionsBarsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  render(): void {
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

    const series: uPlot.Series[] = [];
    const dataSeries: number[][] = [distribution.timestamps];
    for (let i = 1; i <= 5; i++) {
      dataSeries.push(distribution.ratings[i] || []);
    }

    let { opts, data } = getStackedOpts(
      opts_danger_rating_micro_regions_bars,
      series,
      dataSeries,
      null,
    );
    this.createPlot(opts, data);
  }
}

customElements.define("aws-danger-rating-micro-regions-bars", DangerRatingMicroRegionsBarsChart);
