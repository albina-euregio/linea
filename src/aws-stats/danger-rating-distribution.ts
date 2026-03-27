import { i18n } from "../i18n";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import type { AwsExportChartConfiguration } from "./aws-stats-export-modal";
import { BulletinData } from "./datastore";
import {
  dangerDistributionOrder,
  getDangerDistributionSeries,
  opts_danger_rating_distribution,
  opts_danger_rating_distribution_reference_series,
} from "./series-options/danger-rating-distribution-opts";

export class DangerRatingChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  async render(): Promise<void> {
    const bulletinData = new BulletinData(this.bulletins);
    const distribution = bulletinData.dangerRatingDistribution;

    const indexByRating: Record<string, number> = {
      low: 0,
      moderate: 1,
      considerable: 2,
      high: 3,
      very_high: 4,
      1: 0,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
    };

    const counts = Array.from<number>({ length: dangerDistributionOrder.length }).fill(0);
    for (const entry of distribution) {
      const idx = indexByRating[String(entry.rating).toLowerCase()];
      if (idx !== undefined) {
        counts[idx] += entry.count;
      }
    }

    if (counts.every((value) => value === 0)) {
      const empty = document.createElement("div");
      empty.textContent = i18n.message("linea:yearly:dangerratingdistribution:no-data");
      empty.style.padding = "16px";
      this.appendChild(empty);
      return;
    }

    const xValues = dangerDistributionOrder.map((_, index) => index + 1);
    this.plotInformation = {
      data: [xValues, counts],
    } as PlotInformation;
    this.plotData(this.plotInformation);
  }

  plotData(dataInformation: PlotInformation): void {
    let sum = 0;
    dataInformation.data[1].forEach((value) => {
      if (typeof value === "number") {
        sum += value;
      }
    });
    this.createPlot(
      {
        ...opts_danger_rating_distribution,
        title: `${opts_danger_rating_distribution.title} (N = ${sum})`,
      },
      [dataInformation.data[0]],
    );
    this.addSeries(opts_danger_rating_distribution_reference_series, [19, 42, 37, 2.2, 0.1]);

    for (let i = 0; i < dangerDistributionOrder.length; i++) {
      const sparseSeries = dataInformation.data[0].map((_x, index) =>
        index === i ? (dataInformation.data[1][i] / sum) * 100 : null,
      ) as (number | null)[];
      this.addSeries(getDangerDistributionSeries(dangerDistributionOrder[i]), sparseSeries);
    }
  }

  get exportConfiguration(): AwsExportChartConfiguration {
    return {
      ...super.exportConfiguration,
      pngLegend: false,
    };
  }
}

customElements.define("aws-danger-rating-distribution", DangerRatingChart);
