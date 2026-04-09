import { z } from "zod";
import uPlot from "uplot";
import cssComponent from "./abstract-chart.css?raw";
import cssuPlot from "uplot/dist/uPlot.min.css?raw";
import type { AwsExportChartConfiguration } from "./aws-stats-export-modal";
import type { Bulletin } from "../schema/caaml";
import { dangerSourceVariantSchema, type DangerSourceVariant } from "../schema/danger-source-data";
import type { BlogData } from "./datatypes";

export interface PlotInformation {
  data: uPlot.AlignedData;
  [key: string]: any;
}

export abstract class AbstractChart extends HTMLElement {
  public container!: HTMLDivElement;
  public plot: uPlot | null = null;
  readonly resizeObserver: ResizeObserver;
  protected bulletins!: Bulletin[];
  public plotInformation: PlotInformation;

  protected filterMicroRegions: string[] = [];

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.container && this.plot) {
        this.resizePlot(this.container.clientWidth, this.container.style);
      }
    });
  }

  connectedCallback() {
    if (this.hasAttribute("filter-micro-region")) {
      this.filterMicroRegions = JSON.parse(this.getAttribute("filter-micro-region")) as string[];
    }
    this.onConnected()
      .then(() => {
        this.buildLayout();
        if (this.plot) {
          this.plot.destroy();
          this.plot = null;
        }
        if (this.container) {
          this.container.remove();
        }
        if (this.hasAttribute("data")) {
          const data = JSON.parse(this.getAttribute("data")!);
          this.plotData(data as PlotInformation);
          if (this.container && this.plot) {
            this.resizePlot(this.container.clientWidth, this.container.style);
            this.resizeObserver.observe(this.container);
          }
          return;
        } else {
          this.render().then(() => {
            if (this.container && this.plot) {
              this.resizePlot(this.container.clientWidth, this.container.style);
              this.resizeObserver.observe(this.container);
            }
          });
        }
      })
      .catch((error) => {
        console.error("Failed to initialize chart:", error);
        this.buildLayout();
      });
  }

  disconnectedCallback() {
    this.onDisconnected().then(() => {
      if (this.container) {
        this.resizeObserver.unobserve(this.container);
      }
      this.remove();
    });
  }

  protected parseBulletins(raw: string | null) {
    if (!raw) {
      this.bulletins = [];
      return;
    }
    try {
      this.bulletins = JSON.parse(raw) as Bulletin[];
    } catch {
      this.bulletins = [];
    }
  }

  protected parseDangerSourceVariants(raw: string | null): DangerSourceVariant[] {
    if (!raw) {
      console.warn("No danger source variants provided");
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      const variantSchema = Array.isArray(parsed)
        ? z.array(dangerSourceVariantSchema)
        : dangerSourceVariantSchema;
      const validated = variantSchema.parse(Array.isArray(parsed) ? parsed : [parsed]);
      return Array.isArray(validated) ? validated : [validated];
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation failed for DangerSourceVariant:");
        error.issues.forEach((issue) => {
          console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
        });
      } else if (error instanceof SyntaxError) {
        console.error("JSON parse error:", error.message);
      } else {
        console.error("Unknown error while parsing danger source variants:", error);
      }
      return [];
    }
  }

  protected parseBlogs(raw: string): BlogData[] {
    try {
      return JSON.parse(raw) as BlogData[];
    } catch {
      return [];
    }
  }

  protected createPlot(options: uPlot.Options, data: uPlot.AlignedData): uPlot {
    this.container = document.createElement("div");
    this.appendChild(this.container);
    this.plot = new uPlot(options, data, this.container);
    return this.plot;
  }

  protected buildLayout() {
    const style = document.createElement("style");
    style.textContent = [cssComponent, cssuPlot].join("\n");
    this.appendChild(style);
  }

  async render(): Promise<void> {}

  abstract plotData(plotInformation: PlotInformation): void;

  async onConnected(): Promise<void> {
    // Default implementation - can be overridden by subclasses
  }

  async onDisconnected(): Promise<void> {
    // Default implementation - can be overridden by subclasses
  }

  get canvas(): HTMLCanvasElement | null {
    return this.querySelector("canvas");
  }

  get uplot(): uPlot | null {
    return this.plot;
  }

  get exportConfiguration(): AwsExportChartConfiguration {
    return {
      title: this.plot?.root.querySelector(".u-title")?.textContent?.trim() || "",
      pngLegend: true,
      interactiveLegend: true,
    };
  }

  addSeries(series: uPlot.Series, data: (number | null)[]) {
    if (!this.plot) {
      return;
    }
    if (!data) {
      console.debug("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    this.plot.addSeries({ ...series, show: !!data?.length });
    const nextData = [...this.plot.data, data] as uPlot.AlignedData;
    this.plot.setData(nextData, false);
  }

  setData(timestamps: number[], seriesData: (number | null)[][]) {
    if (this.plot) {
      this.plot.setData([timestamps, ...seriesData] as uPlot.AlignedData);
    }
  }

  resizePlot(clientWidth: number, style: CSSStyleDeclaration, heightPerCanvas: number = NaN) {
    if (!this.plot) {
      return;
    }

    this.plot.setSize({
      width: clientWidth,
      height: Number.isNaN(heightPerCanvas) ? this.plot.height : heightPerCanvas,
    });

    const baseWidth = 360;
    const minScale = 0.6;
    const scale = Math.max(minScale, Math.min(1, clientWidth / baseWidth));

    style.fontSize = `${12 * scale}px`;
    style.padding = `${6 * scale}px ${10 * scale}px`;
  }
}
