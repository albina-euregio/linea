import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { BulletinData } from "./datastore";
import {
  getStackedOpts,
  opts_danger_rating_micro_regions_bars,
} from "./series-options/danger-rating-micro-regions-bars-opts";

export class DangerRatingMicroRegionsBarsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
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

    const dataSeries: number[][] = [distribution.timestamps];
    for (let i = 1; i <= 5; i++) {
      dataSeries.push(distribution.ratings[i as 1 | 2 | 3 | 4 | 5] || []);
    }
    this.plotData((this.plotInformation = { data: dataSeries as uPlot.AlignedData }));
  }

  plotData(plotInformation: PlotInformation): void {
    let { opts, data } = getStackedOpts(
      opts_danger_rating_micro_regions_bars,
      plotInformation.data as number[][],
      null,
    );
    this.createPlot(opts, data as uPlot.AlignedData);
  }
}

customElements.define("aws-danger-rating-micro-regions-bars", DangerRatingMicroRegionsBarsChart);
