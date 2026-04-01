import { i18n } from "../i18n";
import { AbstractChart } from "./abstract-chart";
import { AbstractExportModal } from "../shared/abstract-export-modal";
import type { AwsStats } from "./aws-stats-wrapper";

/**
 * ExportModal class handles the export functionality for AwsStats charts.
 *
 * Provides users with options to export charts in various formats (PNG, iframe, standalone HTML)
 * with customizable export settings such as width, height, and title.
 *
 * @class ExportModal
 *
 * @property {HTMLDivElement} exportOptions - Container for export format options
 * @property {HTMLDivElement} exportSettings - Container for export configuration settings
 * @property {HTMLDivElement} exportResult - Container for displaying export results
 * @property {Object|null} exportdata - Exported data object containing blob, data, filename, and type
 * @property {Blob} exportdata.blob - The binary data of the exported file
 * @property {string} exportdata.data - The data URL representation of the export
 * @property {string} exportdata.filename - The filename for the exported file
 * @property {string} exportdata.type - The MIME type of the exported file
 *
 * @features
 * - PNG export with customizable dimensions and title
 * - Multi-chart export combining multiple LineaChart plots
 * - Automatic legend generation from plot series
 * - Download exported files to local system
 * - Open exports in new browser tab
 * - Responsive modal UI with export settings panel
 * - Station selection via checkboxes
 * - Dynamic title generation based on selected stations
 * - Chart resizing with preservation of original dimensions
 *
 * @example
 * const exportModal = new ExportModal(modalElement, lineaPlot);
 * exportModal.show();
 */
export class AwsStatsExportModal extends AbstractExportModal {
  private wrapper: AwsStats;
  private readonly swatchSize = 18;
  private readonly legendItemHeight = 22;
  private readonly legendPadding = 20;
  private readonly labelFontSize = 16;

  private readonly titleFontFamily =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

  /**
   * Creates an instance of ExportModal and initializes the modal UI.
   *
   * Sets up the export modal HTML structure, CSS styles, and event listeners for:
   * - PNG export with resizable dimensions
   * - Copy to clipboard functionality
   * - Download and open exported files
   *
   * @constructor
   * @param {HTMLDivElement} modal - The modal container element
   * @param {AbstractChart} chart - The AbstractChart instance to export
   */
  constructor(modal: HTMLDivElement, wrapper: AwsStats) {
    super(modal);
    this.wrapper = wrapper;

    (this.modal.querySelector("#btnExportSmet") as HTMLElement)!.style!.display = "none";
    (this.modal.querySelector("#btnExportInteractiveBlog") as HTMLElement)!.style!.display =
      "block";
    const titleInput = this.modal.querySelector("#exportTitle") as HTMLInputElement | null;
    titleInput.style.display = "none";
  }

  /**
   * Displays the export modal and initializes available export options.
   *
   * Populates the diagram selection checkboxes with all available LineaCharts
   * and sets default values for export settings based on current plot dimensions.
   *
   * @public
   * @returns {void}
   */
  show() {
    this.modal.style.display = "block";
    this.exportSettings.style.display = "block";
    this.exportResult.style.display = "none";

    this.addDiagramsToExportSettings(this.wrapper.charts.map((c) => c.plot));
  }

  private generateInteractivExportData(): string[] {
    const selectedChartIndices = this.getCheckedDiagramIndices();
    if (selectedChartIndices.length === 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }

    const chartTypes = (this.wrapper.getAttribute("chart-type") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (selectedChartIndices.length === 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }

    const elements: string[] = [];

    for (const i of selectedChartIndices) {
      const chart: AbstractChart = this.wrapper.charts[i];
      elements.push(
        `<${chartTypes[i]} class="linea-custom-element" data='${JSON.stringify(chart.plotInformation)}'></${chartTypes[i]}>`,
      );
    }
    return elements;
  }
  protected async exportAsIframe() {
    this.hideAllSeriesSelectionCheckboxes();
    const elements = this.generateInteractivExportData();
    const iframeTemplate = await import("../shared/iframetemplate.html?raw").then((m) => m.default);
    const body = `<body>
        ${elements.join("\n")}
        <script type="module" src="https://albina-euregio.gitlab.io/linea/aws-stats.mjs"></script>
      </body>`;
    let html = iframeTemplate.replace("BODY", body).replace('lang="en"', `lang="${i18n.lang}"`);

    const exports = this.getExportSettings();
    const estimatedHeight = Math.max(
      250,
      (exports.heightPerCanvas + 90) * this.getCheckedDiagramIndices().length,
    );
    const iframeTitle = AbstractExportModal.escapeHtmlAttribute(exports.title || "AWS Stats");

    const iframecode = `<iframe
          srcdoc="${AbstractExportModal.escapeHtmlAttribute(html)}"
          frameborder="0"
          scrolling="no"
          style="width: 100%; height: ${estimatedHeight}px;border:none;overflow:hidden;"
          title="${iframeTitle}">
      </iframe>`;

    this.exportResult.style.display = "block";
    document.getElementById("exportCode")!.innerHTML = iframecode;

    this.exportdata = {
      blob: new Blob([iframecode], {
        type: "text/html",
      }),
      data: iframecode,
      filename: "export.html",
      type: "text/html",
    };
  }

  protected async exportAsBlogElement() {
    this.hideAllSeriesSelectionCheckboxes();
    if (this.getCheckedDiagramIndices().length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }
    const exports = this.getExportSettings();
    const elements = this.generateInteractivExportData();
    const dataUrl = await this.exportAllPlotsToPNG(
      { width: 750, heightPerCanvas: 200, title: exports.title },
      true,
    );
    if (!dataUrl) {
      return;
    }
    let html = `<div style="display: grid; width: 100%;" data-lineaplot-wrapper>
      <img style="grid-area: 1 / 1; pointer-events: none;" src="${dataUrl}"/>
      <div style="grid-area: 1 / 1; max-width: 100%; max-height: 100%; overflow: hidden;">
        ${elements.join("\n")}
      </div>
    </div>`;

    const binary = AbstractExportModal.toBinary(html);

    let totalCanvases = 0;
    this.getCheckedDiagramIndices().forEach((index) => {
      totalCanvases += this.getCheckedSeriesIndices(index).length;
    });

    const iframeshortcode = `[lineaplotblog height="auto" title="${exports.title}"]data:text/html;base64,${btoa(binary)}[/lineaplotblog]`;

    this.exportResult.style.display = "block";
    document.getElementById("exportCode")!.innerHTML = `<p>${iframeshortcode}</p>`;
    this.exportdata = {
      blob: new Blob([iframeshortcode], {
        type: "text/plain",
      }),
      data: iframeshortcode,
      filename: "awsstats.txt",
      type: "text/plain",
    };
  }

  private exportPlotToPNG(
    outCanvas: HTMLCanvasElement,
    chart: AbstractChart,
    yOffset: number,
    chartTitle: string,
    legendLines: Array<{ items: Array<{ label: string; color: string; width: number }> }>,
    drawLegend: boolean,
  ): number {
    const plot = chart.plot;
    const sourceCanvas = plot?.root.querySelector("canvas");
    if (!plot || !sourceCanvas) {
      return yOffset;
    }

    const ctx = outCanvas.getContext("2d")!;
    const titleHeight = chartTitle ? 40 : 0;
    const xOffset = (outCanvas.width - sourceCanvas.width) / 2;

    if (chartTitle) {
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      let fontSize = 24;
      ctx.font = `bold ${fontSize}px ${this.titleFontFamily}`;
      let titleWidth = ctx.measureText(chartTitle).width;

      while (titleWidth > outCanvas.width - 40 && fontSize > 12) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px ${this.titleFontFamily}`;
        titleWidth = ctx.measureText(chartTitle).width;
      }
      ctx.fillText(chartTitle, outCanvas.width / 2, yOffset + 18);
    }

    let y = yOffset + titleHeight;
    ctx.drawImage(sourceCanvas, xOffset, y);
    y += sourceCanvas.height;

    if (drawLegend) {
      let lineIndex = 0;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `${this.labelFontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      for (const line of legendLines) {
        const totalLineWidth = line.items.reduce((sum, item) => sum + item.width, 0);
        const centeredStartX = (outCanvas.width - totalLineWidth) / 2;

        let x = centeredStartX;
        for (const item of line.items) {
          ctx.fillStyle = item.color;
          ctx.fillRect(
            x,
            y +
              this.legendPadding +
              (lineIndex * this.legendItemHeight * 3) / 2 -
              this.swatchSize / 2,
            this.swatchSize,
            this.swatchSize,
          );

          ctx.fillStyle = "#000";
          ctx.fillText(
            item.label,
            x + this.swatchSize + 8,
            y + this.legendPadding + (lineIndex * this.legendItemHeight * 3) / 2,
          );
          x += item.width;
        }
        lineIndex++;
      }
      y += (legendLines.length * this.legendItemHeight * 3) / 2;
    }

    return y;
  }

  /**
   * Exports all active LineaChart plots to a single PNG image.
   *
   * Combines multiple plot canvases into a single PNG file with:
   * - Configurable title at the top
   * - All selected chart plots
   * - Automatically generated legend from plot series
   * - White background if only one chart is exported
   *
   * The PNG dimensions are determined by the export settings and canvas heights.
   *
   * @private
   * @async
   * @param {string} [title] - Optional title for the PNG export, defaults to generated title
   * @returns {Promise<void>}
   *
   * @example
   * await this.#exportAllPlotsToPNG("Custom Title");
   */
  protected async exportAllPlotsToPNG(
    { width, heightPerCanvas, title }: { width: number; heightPerCanvas: number; title: string },
    noshow: boolean = false,
  ): Promise<string> {
    this.showAllSeriesSelectionCheckboxes();
    const sections: Array<{
      chart: AbstractChart;
      chartTitle: string;
      legendLines: Array<{ items: Array<{ label: string; color: string; width: number }> }>;
      sectionHeight: number;
      canvasWidth: number;
    }> = [];
    const resizedCharts: Array<{ chart: AbstractChart; initialHeight: number }> = [];
    const seriesVisibilityState: Array<{
      chart: AbstractChart;
      visibility: Array<{ index: number; show: boolean }>;
    }> = [];

    const selectedChartIndices = this.getCheckedDiagramIndices();
    if (selectedChartIndices.length === 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return "";
    }

    try {
      for (const chartIndex of selectedChartIndices) {
        const chart = this.wrapper.charts[chartIndex];
        const plot = chart.plot;
        const canvas = plot?.root.querySelector("canvas");
        if (!plot || !canvas) {
          continue;
        }

        const selectedSeries = this.getCheckedSeriesIndices(chartIndex);
        const visibility: Array<{ index: number; show: boolean }> = [];
        plot.series.slice(1).forEach((series, i) => {
          const seriesIndex = i + 1;
          visibility.push({ index: seriesIndex, show: !!series.show });
          plot.setSeries(seriesIndex, { show: selectedSeries.includes(seriesIndex) });
        });
        seriesVisibilityState.push({ chart, visibility });

        const parentWidth = (width * chart.container.clientWidth) / canvas.width;
        resizedCharts.push({ chart, initialHeight: plot.height });
        chart.resizeObserver.unobserve(chart.container);
        chart.resizePlot(parentWidth, chart.container.style, heightPerCanvas);
      }

      await new Promise((r) => setTimeout(r, 1));

      const drawLegend = !!this.wrapper.charts[0]?.exportConfiguration.pngLegend;

      for (const chartIndex of selectedChartIndices) {
        const chart = this.wrapper.charts[chartIndex];
        const plot = chart.plot;
        const canvas = plot?.root.querySelector("canvas");
        if (!plot || !canvas) {
          continue;
        }

        const selectedSeries = this.getCheckedSeriesIndices(chartIndex);
        if (selectedSeries.length === 0) {
          continue;
        }

        const titleFromDom = plot.root.querySelector(".u-title")?.textContent?.trim() ?? "";
        const titleFromOpts = (plot as unknown as { opts?: { title?: string } }).opts?.title ?? "";
        const chartTitle = titleFromDom || titleFromOpts || title || "";

        const legendItems: Record<string, string> = {};
        selectedSeries.forEach((seriesIndex) => {
          const s = plot.series[seriesIndex];
          if (!s) {
            return;
          }
          const label = s.label ?? `Series ${seriesIndex}`;
          let color = "#000000";
          if (typeof s.stroke === "string") {
            color = s.stroke;
          } else if (typeof s.stroke === "function") {
            const c = s.stroke(plot, seriesIndex);
            if (typeof c === "string") color = c;
          }
          legendItems[String(label)] = color;
        });

        const legendLines: Array<{
          items: Array<{ label: string; color: string; width: number }>;
        }> = [];
        if (drawLegend && Object.keys(legendItems).length > 0) {
          const legendCtx = canvas.getContext("2d")!;
          legendCtx.textAlign = "left";
          legendCtx.textBaseline = "middle";
          legendCtx.font = `${this.labelFontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;

          let currentLine: Array<{ label: string; color: string; width: number }> = [];
          let currentLineWidth = 0;

          for (const [label, color] of Object.entries(legendItems)) {
            const textwidth = legendCtx.measureText(label).width;
            const itemWidth = this.swatchSize + 8 + textwidth + 10;

            if (currentLineWidth + itemWidth > canvas.width - this.legendPadding * 2) {
              if (currentLine.length > 0) {
                legendLines.push({ items: currentLine });
                currentLine = [];
                currentLineWidth = 0;
              }
            }

            currentLine.push({ label, color: color as string, width: itemWidth });
            currentLineWidth += itemWidth;
          }

          if (currentLine.length > 0) {
            legendLines.push({ items: currentLine });
          }
        }

        const sectionTitleHeight = chartTitle ? 40 : 0;
        const sectionLegendHeight = drawLegend
          ? (legendLines.length * this.legendItemHeight * 3) / 2
          : 0;
        sections.push({
          chart,
          chartTitle,
          legendLines,
          sectionHeight: sectionTitleHeight + canvas.height + sectionLegendHeight,
          canvasWidth: canvas.width,
        });
      }

      if (sections.length === 0) {
        alert(i18n.message("linea:message:noplotselected"));
        return "";
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = Math.max(...sections.map((s) => s.canvasWidth));
      outCanvas.height = sections.reduce((sum, s) => sum + s.sectionHeight, 0);

      const ctx = outCanvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

      let y = 0;
      for (const section of sections) {
        y = this.exportPlotToPNG(
          outCanvas,
          section.chart,
          y,
          section.chartTitle,
          section.legendLines,
          section.chart.exportConfiguration.pngLegend,
        );
      }

      if (!noshow) {
        outCanvas.toBlob((blobdata) => {
          this.exportdata = {
            blob: blobdata,
            data: outCanvas.toDataURL(),
            filename: "export.png",
            type: "image/png",
          };
        });
        document.getElementById("exportCode")!.innerHTML =
          `<img src="${outCanvas.toDataURL()}" alt="Chart Preview" style="max-width: 100%; border: 1px solid #333; border-radius: 4px;"/>`;
        document.getElementById("exportResult")!.style.display = "block";
      }

      return outCanvas.toDataURL();
    } finally {
      for (const state of seriesVisibilityState) {
        const plot = state.chart.plot;
        if (!plot) {
          continue;
        }
        for (const seriesState of state.visibility) {
          plot.setSeries(seriesState.index, { show: seriesState.show });
        }
      }
      for (const { chart, initialHeight } of resizedCharts) {
        chart.resizePlot(chart.container.clientWidth, chart.container.style, initialHeight);
        chart.resizeObserver.observe(chart.container);
      }
    }
  }
}

export interface AwsExportChartConfiguration {
  title: string;
  pngLegend: boolean;
  interactiveLegend: boolean;
}
