import { i18n } from "../i18n";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import type { DangerSourceVariant } from "./danger-source-data";
import { DangerSourceVariantService } from "./datastore";
import {
  opts_danger_rating,
  opts_danger_rating_series_base,
} from "./series-options/danger-rating-opts";

interface DangerRatingDangerSourceVariantPlotInformation extends PlotInformation {
  variants: string[];
  microRegion: string;
}

export class DangerRatingDangerSourceVariantsChart extends AbstractChart {
  private dangerSourceVariants: DangerSourceVariant[] = [];

  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.dangerSourceVariants = this.parseDangerSourceVariants(
      this.getAttribute("danger-source-variants"),
    );
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

  async render(): Promise<void> {
    const dsv = new DangerSourceVariantService(this.dangerSourceVariants);
    const { timestamps, ratings } =
      dsv.analysis.activeOrDormant.getDangerRatingPerDangerSourceVariantPerDay(
        this.filterMicroRegions[0],
      );
    const plotInformation: DangerRatingDangerSourceVariantPlotInformation = {
      data: [timestamps, ...Object.values(ratings)],
      variants: Object.keys(ratings),
      microRegion: this.filterMicroRegions[0],
    };
    this.plotInformation = plotInformation;
    this.plotData(plotInformation);
  }

  plotData(plotInformation: DangerRatingDangerSourceVariantPlotInformation): void {
    this.createPlot(
      {
        ...opts_danger_rating,
        title: `${i18n.message("linea:dangerrating:title")} – ${this.filterMicroRegions[0]}`,
      },
      [plotInformation.data[0]],
    );
    Object.entries(plotInformation.data.slice(1)).forEach(([variantId, rating], index) => {
      this.addSeries(
        {
          ...opts_danger_rating_series_base,
          stroke:
            DangerRatingDangerSourceVariantsChart.COLORS[
              index % DangerRatingDangerSourceVariantsChart.COLORS.length
            ],
          label: plotInformation.variants[index],
        },
        rating as number[],
      );
      console.log(variantId, rating);
    });
  }
}
customElements.define(
  "aws-danger-rating-danger-source-variants",
  DangerRatingDangerSourceVariantsChart,
);
