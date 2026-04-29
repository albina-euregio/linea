import type uPlot from "uplot";
import { AbstractChart, type PlotInformation } from "./abstract-chart";
import { BlogService, BulletinData, Observations } from "./datastore";
import {
  getStackedOpts,
  opts_products_bars,
  opts_series_products,
} from "./series-options/products-opts";
import { i18n } from "../i18n";
import type { BlogData } from "./datatypes";

interface ProductsPlotInformation extends PlotInformation {
  blogLabels: string[];
}

export class ProductsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    if (this.hasAttribute("bulletins")) {
      this.parseBulletins(this.getAttribute("bulletins"));
    }
  }

  async render() {
    const bulletinData = new BulletinData(this.bulletins);
    const bulletins = bulletinData.filterRegionCode(this.regionCode).bulletinsPerDay;

    const fieldTrainings = this.getAttribute("field-trainings")
      ? JSON.parse(this.getAttribute("field-trainings")!)
      : [];
    const virtualTrainings = this.getAttribute("virtual-trainings")
      ? JSON.parse(this.getAttribute("virtual-trainings")!)
      : [];

    const blogs: BlogData[] = this.getAttribute("blogs")
      ? this.parseBlogs(this.getAttribute("blogs")!)
      : [];
    const blogData: { timestamps: number[]; data: number[] }[] = [];

    for (const blog of blogs) {
      if (blog.regionCode === this.regionCode || this.regionCode === "all") {
        const data = BlogService.getBlogsPerDay(blog);
        blogData.push(data);
      }
    }

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      bulletins,
      this.convertTrainingsToDataset(fieldTrainings),
      this.convertTrainingsToDataset(virtualTrainings),
      ...blogData,
    ]);

    this.plotInformation = {
      data: [timestamps, ...seriesData] as uPlot.AlignedData,
      blogLabels: blogs.map((b) => b.regionCode),
    } as ProductsPlotInformation;
    this.plotData(this.plotInformation as ProductsPlotInformation);
  }

  plotData(plotInformation: ProductsPlotInformation): void {
    const strokes = ["#bd2d23", "#bd5423", "#bda123"];
    const fills = [
      "rgba(196, 81, 81, 0.62)",
      "rgba(196, 114, 81, 0.62)",
      "rgba(196, 160, 81, 0.62)",
    ];
    const series = [...opts_products_bars.series] as uPlot.Series[];
    plotInformation.blogLabels.forEach((label, index) => {
      series.push({
        ...opts_series_products,
        label: `${i18n.message(`linea:yearly:products:series:blogs`)} ${label}`,
        stroke: strokes[index % strokes.length],
        fill: fills[index % fills.length],
      });
    });
    let { opts, data } = getStackedOpts(
      {
        ...opts_products_bars,
        series: series,
      },
      plotInformation.data as number[][],
      null,
    );
    this.createPlot(opts, data as uPlot.AlignedData);
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
