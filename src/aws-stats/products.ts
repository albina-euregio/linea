import type uPlot from "uplot";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { BlogService, BulletinData, Observations } from "./datastore";
import { getStackedOpts, opts_products_bars } from "./series-options/products-opts";
import type { StackedData } from "../shared/stacked-series-opts";

export class ProductsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
  }

  async render() {
    if (this.bulletins.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No bulletin data available";
      empty.style.padding = "16px";
      this.appendChild(empty);
      return;
    }

    const bulletinData = new BulletinData(this.bulletins);
    const bulletins = bulletinData.filterRegionCode("all").bulletinsPerDay;

    const fieldTrainings = this.getAttribute("field-trainings")
      ? JSON.parse(this.getAttribute("field-trainings")!)
      : [];
    const virtualTrainings = this.getAttribute("virtual-trainings")
      ? JSON.parse(this.getAttribute("virtual-trainings")!)
      : [];
    const blogsTyrol = await BlogService.loadBlogData(
      "AT-07",
      this.getAttribute("start-date")! + "T00:00:00.000Z",
      this.getAttribute("end-date") + "T23:59:59.999Z",
    );
    const blogsSouthTirol = await BlogService.loadBlogData(
      "IT-32-BZ",
      this.getAttribute("start-date")! + "T00:00:00.000Z",
      this.getAttribute("end-date") + "T23:59:59.999Z",
    );
    const blogsTrentino = await BlogService.loadBlogData(
      "IT-32-TN",
      this.getAttribute("start-date")! + "T00:00:00.000Z",
      this.getAttribute("end-date") + "T23:59:59.999Z",
    );

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      bulletins,
      this.convertTrainingsToDataset(fieldTrainings),
      this.convertTrainingsToDataset(virtualTrainings),
      blogsTyrol,
      blogsSouthTirol,
      blogsTrentino,
    ]);

    this.plotInformation = { data: [timestamps, ...seriesData] };
    this.plotData(this.plotInformation);
  }

  plotData(plotInformation: PlotInformation): void {
    let { opts: stackedOpts, data: stackedData } = getStackedOpts(
      opts_products_bars,
      plotInformation.data as StackedData,
      null,
    );
    this.createPlot(stackedOpts, stackedData as uPlot.AlignedData);
  }

  private convertTrainingsToDataset(trainingDates: string[]): {
    timestamps: number[];
    data: number[];
  } {
    const timestamps: number[] = trainingDates.map((v) => new Date(v).getTime());
    const data: number[] = timestamps.map(() => 1);
    return { timestamps, data };
  }
}

customElements.define("aws-products", ProductsChart);
