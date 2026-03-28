import {
  opts_avalanches,
  opts_series_avalanches,
  opts_series_observations,
  opts_series_precipitation,
} from "./series-options/observations-opts";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { Observations, WeatherStationData } from "./datastore";

interface AvalanchesPlotInformation extends PlotInformation {
  weather: boolean;
  countPerDayObservations: boolean;
  countPerDay: boolean;
}

export class ObservationsChart extends AbstractChart {
  private observations!: Observations;
  private weather: WeatherStationData | null = null;

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

    const weatherAttr = this.getAttribute("weather");
    if (weatherAttr) {
      try {
        this.weather = new WeatherStationData(weatherAttr);
      } catch (error) {
        console.error("Invalid weather payload:", error);
        this.weather = null;
      }
    }
  }

  async render(): Promise<void> {
    const countPerDayObservations = this.observations.countperday;
    const countPerDay = this.observations.avalanches.countperday;
    const precipitationPerDay = this.weather
      ? this.weather.aggregateDailyPrecipitation()
      : { timestamps: [], values: [] as number[] };

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      { timestamps: precipitationPerDay.timestamps, data: precipitationPerDay.values },
      { timestamps: countPerDayObservations.timestamps, data: countPerDayObservations.countPerDay },
      { timestamps: countPerDay.timestamps, data: countPerDay.countPerDay },
    ]);
    this.plotInformation = {
      data: [timestamps, ...seriesData],
      weather: !!this.weather && this.weather.timestamps.length > 0,
      countPerDayObservations: countPerDayObservations.timestamps.length > 0,
      countPerDay: countPerDay.timestamps.length > 0,
    } as AvalanchesPlotInformation;
    this.plotData(this.plotInformation as AvalanchesPlotInformation);
  }

  plotData(plotInformation: AvalanchesPlotInformation): void {
    this.createPlot(opts_avalanches, [plotInformation.data[0]]);
    if (plotInformation.weather) {
      this.addSeries(opts_series_precipitation, plotInformation.data[1] as number[]);
    }
    if (plotInformation.countPerDayObservations) {
      this.addSeries(opts_series_observations, plotInformation.data[2] as number[]);
    }
    if (plotInformation.countPerDay) {
      this.addSeries(opts_series_avalanches, plotInformation.data[3] as number[]);
    }
  }
}

customElements.define("aws-observations", ObservationsChart);
