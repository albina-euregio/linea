import type uPlot from "uplot";
import { AbstractChart } from "./abstract-chart";
import { BlogService, BulletinData, Observations } from "./datastore";
import {
  getStackedOpts,
  opts_products_bars,
  opts_series_products,
} from "./series-options/products-opts";
import { i18n } from "../i18n";

export class ProductsChart extends AbstractChart {
  async onConnected(): Promise<void> {
    this.parseBulletins(this.getAttribute("bulletins"));
    this.exportModal.legend = false;
  }

  async render() {
    if (this.plot) {
      this.plot.destroy();
      this.plot = null;
    }
    if (this.container) {
      this.container.remove();
    }

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

    const blogUrls = this.getAttribute("blog-urls")
      ? (JSON.parse(this.getAttribute("blog-urls")!) as {
          regionCode: string;
          label: string;
          url: string;
        }[])
      : ([] as { regionCode: string; label: string; url: string }[]);
    console.log(blogUrls);
    const blogData: { timestamps: number[]; data: number[] }[] = [];

    for (const regionBlog of blogUrls) {
      const url2 = regionBlog.url
        .replace("{before}", this.getAttribute("end-date") + "T23:59:59.999Z")
        .replace("{after}", this.getAttribute("start-date")! + "T00:00:00.000Z");
      const data = await BlogService.loadBlogData(url2);
      blogData.push(data);
    }

    const { timestamps, seriesData } = Observations.mergeAndFillData([
      bulletins,
      this.convertTrainingsToDataset(fieldTrainings),
      this.convertTrainingsToDataset(virtualTrainings),
      ...blogData,
    ]);
    const pre_opts = opts_products_bars;

    const strokes = ["#bd2d23", "#bd5423", "#bda123"];
    const fills = [
      "rgba(196, 81, 81, 0.62)",
      "rgba(196, 114, 81, 0.62)",
      "rgba(196, 160, 81, 0.62)",
    ];

    blogUrls.forEach((region, index) => {
      pre_opts.series.push({
        ...opts_series_products,
        label: `${i18n.message(`linea:yearly:products:series:blogs`)} ${region.label}`,
        stroke: strokes[index % strokes.length],
        fill: fills[index % fills.length],
      });
    });

    let { opts, data } = getStackedOpts(pre_opts, [timestamps, ...seriesData], null);
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
