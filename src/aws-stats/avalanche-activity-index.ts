import uPlot from "uplot";
import { AbstractChart } from "./abstract-chart";
import { Observations } from "./datastore";
import {
  opts_avalanche_activity_index,
  opts_series_avalanche_count,
  opts_series_avalanche_count_total,
  opts_series_avalancheactivityindex,
} from "./series-options/avalanche-activity-index";

export class AvalancheActivityIndexChart extends AbstractChart {
  private observations!: Observations;

  constructor() {
    super();
  }

  async onConnected(): Promise<void> {
    try {
      this.observations = new Observations(JSON.parse(this.getAttribute("observations") || "[]"));
    } catch (error) {
      console.error("Invalid observations payload:", error);
      this.observations = new Observations([]);
    }
  }

  async render(): Promise<void> {
    const avalanches = this.observations.sizedAvalanches;
    const { timestamps: indexTimestamps, avalanches: perDay } = avalanches.avalanchesPerDay;
    const { avalancheIndices } = avalanches.calculateAvalancheIndexPerDay(indexTimestamps, perDay);

    const countPerDayData = avalanches.countperday;

    const countPerDayAll = this.observations.avalanches.countperday;

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      { timestamps: indexTimestamps, data: avalancheIndices },
      { timestamps: countPerDayData.timestamps, data: countPerDayData.countPerDay },
      { timestamps: countPerDayAll.timestamps, data: countPerDayAll.countPerDay },
    ]);

    this.createPlot({ ...opts_avalanche_activity_index }, [timestamps]);

    if (timestamps.length > 0 && seriesData.length > 2) {
      this.addSeries(
        {
          ...opts_series_avalanche_count_total,
          paths: uPlot.paths.bars!({ size: [0.4, 100], align: -1 }),
        },
        seriesData[2],
      );
    }
    if (timestamps.length > 0 && seriesData.length > 1) {
      this.addSeries(
        {
          ...opts_series_avalanche_count,
          paths: uPlot.paths.bars!({ size: [0.4, 100], align: seriesData.length > 2 ? 1 : 0 }),
        },
        seriesData[1],
      );
    }
    if (timestamps.length > 0 && seriesData.length > 0) {
      this.addSeries(opts_series_avalancheactivityindex, seriesData[0]);
    }
  }
}

customElements.define("aws-avalanche-activity-index", AvalancheActivityIndexChart);
