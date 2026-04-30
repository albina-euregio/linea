import type { StressLevelData } from "../schema/stress-level";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { BulletinData, Observations, StressService } from "./datastore";
import { COLORS } from "./series-options/colorizer";
import {
  opts_stress,
  opts_stress_danger_rating_series_all,
  opts_stress_series_base,
} from "./series-options/stress-opts";

interface StressPlotInformation extends PlotInformation {
  userNames: string[];
}

export class StressLevelChart extends AbstractChart {
  // if someone ever will find the joke in here i buy you an icecream
  static readonly NAMES = [
    "Lindelof",
    "Wigner",
    "Dirac",
    "Thomson",
    "Isaac",
    "Rutherford",
    "Ohm",
    "Landau",
  ];

  private stressData: StressLevelData = {};

  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.stressData = this.parseStressLevel();
  }

  async render(): Promise<void> {
    const bulletinData = new BulletinData(this.bulletins);
    const { timestamps: stressTimestamps, stressPerPerson } =
      StressService.getStressPerPersonPerDay(this.stressData);
    const personNames = Object.keys(stressPerPerson);

    const dataPairs: { timestamps: number[]; data: number[] }[] = [
      {
        timestamps: bulletinData.highestDangerRatingPerDay.timestamps,
        data: bulletinData.highestDangerRatingPerDay.rating,
      },
      ...personNames.map((name) => ({
        timestamps: stressTimestamps,
        data: stressPerPerson[name],
      })),
    ];

    const { timestamps, seriesData } = Observations.mergeAndFillData(dataPairs);
    this.plotInformation = {
      data: [timestamps, ...seriesData],
      userNames: personNames,
    } as StressPlotInformation;
    this.plotData(this.plotInformation as StressPlotInformation);
  }

  plotData(plotInformation: StressPlotInformation): void {
    this.createPlot(opts_stress, [plotInformation.data[0]]);
    this.addSeries(opts_stress_danger_rating_series_all, plotInformation.data[1] as number[]);
    for (let i = 2; i < plotInformation.data.length; i++) {
      this.addSeries(
        {
          ...opts_stress_series_base,
          stroke: COLORS[(i - 2) % COLORS.length],
          label: StressLevelChart.NAMES[(i - 2) % StressLevelChart.NAMES.length],
        },
        plotInformation.data[i] as number[],
      );
    }
  }
}
customElements.define("aws-stress-level", StressLevelChart);
