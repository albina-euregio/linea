import { AbstractChart } from "./abstract-chart";
import type { AwsExportChartConfiguration } from "./aws-stats-export-modal";
import { BulletinData } from "./datastore";
import { opts_danger_rating_micro_regions } from "./series-options/danger-rating-micro-regions-opts";

export class DangerRatingMicroRegionsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  async render(): Promise<void> {
    const bulletinData = new BulletinData(this.bulletins);
    const distribution = bulletinData.affectedMicroRegionsPerDangerRatingPerDay(
      this.getAttribute("region-code") ?? "all",
    );
    this.plotInformation = {
      data: [
        distribution.timestamps,
        distribution.ratings[1],
        distribution.ratings[2],
        distribution.ratings[3],
        distribution.ratings[4],
        distribution.ratings[5],
      ],
    };
    this.plotData(this.plotInformation);
  }

  plotData(plotInformation: any): void {
    this.createPlot(opts_danger_rating_micro_regions, plotInformation.data);
  }

  get exportConfiguration(): AwsExportChartConfiguration {
    return {
      ...super.exportConfiguration,
      pngLegend: false,
    };
  }
}

customElements.define("aws-danger-rating-micro-regions", DangerRatingMicroRegionsChart);
