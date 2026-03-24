import uPlot from "uplot";
import cssComponent from "./abstract-chart.css?raw";
import cssuPlot from "uplot/dist/uPlot.min.css?raw";
import { AwsStatsExportModal } from "./aws-stats-export-modal";
import { i18n } from "../i18n";
import type { Bulletin } from "./bulletin-schema";

export abstract class AbstractChart extends HTMLElement {
  public container!: HTMLDivElement;
  public plot: uPlot | null = null;
  readonly resizeObserver: ResizeObserver;
  readonly exportModal!: AwsStatsExportModal;
  protected bulletins!: Bulletin[];

  constructor() {
    super();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.container && this.plot) {
        this.resizePlot(this.container.clientWidth, this.container.style);
      }
    });
    this.exportModal = new AwsStatsExportModal(document.createElement("div"), this);
  }

  connectedCallback() {
    this.onConnected()
      .then(() => {
        this.buildLayout();
        this.render();
        if (this.container && this.plot) {
          this.resizePlot(this.container.clientWidth, this.container.style);
          this.resizeObserver.observe(this.container);
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

    const menubar = document.createElement("div");
    menubar.className = "menubar";

    const exportBtn = document.createElement("button");
    exportBtn.textContent = i18n.message("linea:controls:value:export");
    exportBtn.addEventListener("click", () => this.exportModal.show());
    menubar.appendChild(exportBtn);
    this.appendChild(menubar);
    this.appendChild(this.exportModal.modal);
  }

  abstract render(): void;

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
