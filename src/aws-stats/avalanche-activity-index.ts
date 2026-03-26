import uPlot from "uplot";
import { AbstractChart } from "./abstract-chart";
import { Observations, TriggeredAvalancheObservations } from "./datastore";
import { opts_avalanche_activity_index } from "./series-options/avalanche-activity-index-opts";
import { stack2 } from "./series-options/products-opts";

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

    const triggered = new TriggeredAvalancheObservations(avalanches.items);

    const uniqe = new Set(triggered.items.map((v) => v.properties.triggerType));
    console.log(uniqe);

    const spontaneous = triggered.spontanousCount;
    const artificial = triggered.triggeredCount;
    const unknown = triggered.unknownCount;

    const countPerDayAll = this.observations.avalanches.countperday;

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      { timestamps: indexTimestamps, data: avalancheIndices },
      { timestamps: countPerDayAll.timestamps, data: countPerDayAll.countPerDay },
      { timestamps: spontaneous.timestamps, data: spontaneous.countPerDay },
      { timestamps: artificial.timestamps, data: artificial.countPerDay },
      { timestamps: unknown.timestamps, data: unknown.countPerDay },
    ]);

    const series2 = [
      {
        scaleKey: "y",
        values: seriesData[0],
        negY: false,
        stacking: {
          mode: "none",
          group: "B",
        },
      },
      {
        scaleKey: "y2",
        values: seriesData[1],
        negY: false,
        stacking: {
          mode: "none",
          group: "C",
        },
      },
      {
        scaleKey: "y2",
        values: seriesData[2],
        negY: false,
        stacking: {
          mode: "normal",
          group: "A",
        },
      },
      {
        scaleKey: "y2",
        values: seriesData[3],
        negY: false,
        stacking: {
          mode: "normal",
          group: "A",
        },
      },
      {
        scaleKey: "y2",
        values: seriesData[4],
        negY: false,
        stacking: {
          mode: "normal",
          group: "A",
        },
      },
    ];

    const { data: stackedData, bands } = stack2(series2, (_: number) => false);

    const opts: uPlot.Options = {
      ...opts_avalanche_activity_index,
      bands,
    };

    const existingHooks = opts.hooks || {};
    const existingSetSeries = existingHooks.setSeries || [];
    opts.hooks = {
      ...existingHooks,
      setSeries: [
        ...existingSetSeries,
        (u: uPlot, _seriesIdx: number | null, _opts: uPlot.Series) => {
          const restacked = stack2(series2, (seriesIdx: number) => !u.series[seriesIdx + 1].show);
          u.delBand(null);
          restacked.bands.forEach((b: uPlot.Band) => u.addBand(b));
          u.setData([timestamps, ...restacked.data] as unknown as uPlot.AlignedData, false);
        },
      ],
    };

    this.createPlot(opts, [timestamps, ...stackedData]);
  }
}

customElements.define("aws-avalanche-activity-index", AvalancheActivityIndexChart);
