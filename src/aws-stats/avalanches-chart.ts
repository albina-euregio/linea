import {
  opts_avalanches,
  opts_series_avalanches,
  opts_series_observations,
  opts_series_precipitation,
} from "./series-options/opts_avalanches";
import { AbstractChart } from "./abstract-chart";
import { Observations, WeatherStationData } from "./datastore";

export class AvalanchesChart extends AbstractChart {
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

  render() {
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
    this.createPlot({ ...opts_avalanches }, [timestamps]);
    if (this.weather && this.weather.timestamps.length > 0) {
      this.addSeries(opts_series_precipitation, seriesData[0]);
    }
    if (countPerDayObservations.timestamps.length > 0) {
      this.addSeries(opts_series_observations, seriesData[1]);
    }
    if (countPerDay.timestamps.length > 0) {
      this.addSeries(opts_series_avalanches, seriesData[2]);
    }
  }
}

customElements.define("aws-observations", AvalanchesChart);
