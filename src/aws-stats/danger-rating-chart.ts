import { AbstractChart } from "./abstract-chart";
import { BulletinData, Observations } from "./datastore";
import {
  opts_danger_rating,
  opts_danger_rating_series_all,
  opts_danger_rating_series_base,
} from "./series-options/danger-rating-opts";

export class DangerRatingChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  static COLORS = [
    "#4108e6",
    "#dd0841e6",
    "#1b7a35e6",
    "#db08dde6",
    "#07d7e6",
    "#dd0861e6",
    "#6108dde6",
  ];

  render(): void {
    const bulletinData = new BulletinData(this.bulletins);

    if (
      !this.getAttribute("bulletin-filter-micro-region") ||
      this.getAttribute("bulletin-filter-micro-region") == ""
    ) {
      const { timestamps, rating } = bulletinData.highestDangerRatingPerDay;
      this.createPlot(opts_danger_rating, [timestamps]);
      this.addSeries(opts_danger_rating_series_all, rating);
    } else {
      const dataPairs: { timestamps: number[]; data: number[] }[] = [];
      const microRegionNames: string[] = [];
      let microRegionIds = JSON.parse(this.getAttribute("bulletin-filter-micro-region")!);
      if (!Array.isArray(microRegionIds)) {
        microRegionIds = [microRegionIds];
      }
      for (const microRegionID of microRegionIds) {
        const filtered = bulletinData.filterForMicroRegions([microRegionID]);
        const { timestamps, rating } = filtered.highestDangerRatingPerDay;
        dataPairs.push({ timestamps: timestamps, data: rating });
        microRegionNames.push(bulletinData.regionIdToName(microRegionID));
      }
      const { timestamps, seriesData } = Observations.mergeAndFillData(dataPairs);
      this.createPlot(opts_danger_rating, [timestamps]);
      for (let i = 0; i < seriesData.length; i++) {
        this.addSeries(
          {
            ...opts_danger_rating_series_base,
            stroke: DangerRatingChart.COLORS[i % DangerRatingChart.COLORS.length],
            label: microRegionNames[i],
          },
          seriesData[i],
        );
      }
    }
  }
}

customElements.define("aws-danger-rating", DangerRatingChart);
