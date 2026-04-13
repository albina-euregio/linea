import uPlot from "uplot";
import { i18n } from "../i18n";
import { LineaPlot } from "../linea-plot";
import { StationData } from "../data/station-data";
import { AbstractLineaChart } from "../abstract-linea-chart";
import { WinterView } from "./winter-view";
import { AbstractExportModal } from "../shared/abstract-export-modal";

/**
 * ExportModal class handles the export functionality for LineaPlot charts.
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
export class LineaExportModal extends AbstractExportModal {
  private lineaPlot: LineaPlot;
  private readonly maxCanvasPixels = 50_000_000;

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
   * @param {LineaPlot} lineaPlot - The LineaPlot instance to export
   */
  constructor(modal: HTMLDivElement, lineaPlot: LineaPlot) {
    super(modal, lineaPlot.hasAttribute("showinteractiveblogexport"));
    this.lineaPlot = lineaPlot;
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

    this.addDiagramsToExportSettings(this.lineaPlot.view.charts);

    (document.getElementById("exportTitle") as HTMLInputElement)!.value =
      this.#generateTitleString();
    this.modal.querySelectorAll(".diagram-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => {
        (document.getElementById("exportTitle") as HTMLInputElement)!.value =
          this.#generateTitleString();
      });
    });
  }

  /**
   * Downloads all available SMET files
   */
  protected exportAsSMET() {
    this.#downloadSMETS(this.lineaPlot.view.srcs);
  }

  async #downloadSMETS(srcs: string[]) {
    for (const src of srcs) {
      this.download(src, src.split("/")[src.split("/").length - 1]);
      await new Promise(requestAnimationFrame);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  /**
   * Generates the code which can be included into an iframe.
   * @returns Promise<string> - html code to insert into an iframe
   */
  async #generateInteractiveExportData(): Promise<StationData[]> {
    const resultsFiltered: StationData[] = [];

    this.#getActiveLineacharts().forEach((lc, index) => {
      const activeplots = this.getCheckedSeriesIndices(index);
      let result = new StationData(
        lc.result.station,
        lc.result.altitude,
        lc.plots[0].data[0] as number[],
        {},
        {},
      );
      if (this.lineaPlot.view instanceof WinterView) {
        activeplots.forEach((index) => {
          if (lc.plotnames[index] === i18n.message("linea:plotnames:temperature")) {
            result.values.TA = lc.result.values.TA ?? [];
            result.values.TD = lc.result.values.TD ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:newsnow")) {
            result.values.NS = lc.result.values.NS ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:precipitation")) {
            result.values.HS = lc.result.values.HS ?? [];
            result.values.PSUM = lc.result.values.PSUM ?? [];
          }
        });
      } else {
        activeplots.forEach((index) => {
          if (lc.plotnames[index] === i18n.message("linea:plotnames:temperature")) {
            const airTempIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:TA"),
            );
            result.values.TA = lc.plots[index].data[airTempIndex] as (number | null)[];
            const dewPointIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:TD"),
            );
            result.values.TD = lc.plots[index].data[dewPointIndex] as (number | null)[];
            const surfaceIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:TSS"),
            );
            result.values.TSS = lc.plots[index].data[surfaceIndex] as (number | null)[];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:wind")) {
            const windIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:VW"),
            );
            result.values.VW = lc.plots[index].data[windIndex] as (number | null)[];
            const windMaxIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:VW_MAX"),
            );
            result.values.VW_MAX = lc.plots[index].data[windMaxIndex] as (number | null)[];
            const windDirectionIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:DW"),
            );
            result.values.DW = lc.plots[index].data[windDirectionIndex] as (number | null)[];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:humidity_gr")) {
            const humidityIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:RH"),
            );
            result.values.RH = lc.plots[index].data[humidityIndex] as (number | null)[];
            const globalRadiationIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:ISWR"),
            );
            result.values.ISWR = lc.result.values.ISWR
              ? (lc.plots[index].data[globalRadiationIndex] as (number | null)[])
              : [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:precipitation")) {
            const snowHeightIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:HS"),
            );
            result.values.HS = lc.plots[index].data[snowHeightIndex] as (number | null)[];
            const precipitationIndex = lc.plots[index].series.findIndex(
              (s) => s.label === i18n.message("linea:parameter:PSUM"),
            );
            const cumulativePSUM = lc.plots[index].data[precipitationIndex] as (number | null)[];
            result.values.PSUM = this.#reconstructPSUMSeries(cumulativePSUM);
          }
        });
      }
      resultsFiltered.push(result);
    });

    return resultsFiltered;
  }

  /**
   * Handles iframe export functionality.
   *
   * @private
   * @returns {void}
   * @todo Implement iframe export logic
   */
  protected async exportAsIframe() {
    if (this.#getActiveLineacharts().length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }
    const exports = this.getExportSettings();

    const resultsFiltered = await this.#generateInteractiveExportData();
    const serializedData = LineaExportModal.escapeHtmlAttribute(JSON.stringify(resultsFiltered));

    const iframeTemplate = await import("../shared/iframetemplate.html?raw").then((m) => m.default);
    const body = `
      <body>
        <linea-plot data="${serializedData}" showsurfacehoarseries showtitle></linea-plot>
        <script type="module" src="https://albina-euregio.gitlab.io/linea/linea.mjs"></script>
      </body>`;
    let html = iframeTemplate.replace("BODY", body).replace('lang="en"', `lang="${i18n.lang}"`);

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot", "<linea-plot showonlywinter");
    }

    let totalCanvases = 0;
    this.getCheckedDiagramIndices().forEach((index) => {
      totalCanvases += this.getCheckedSeriesIndices(index).length;
    });

    const iframeTitle = LineaExportModal.escapeHtmlAttribute(exports.title);

    const iframecode = `<iframe
          srcdoc="${LineaExportModal.escapeHtmlAttribute(html)}"
          frameborder="0"
          scrolling="no"
          style="width: 100%; height: ${(exports.heightPerCanvas + 50) * totalCanvases + 50 * this.#getActiveLineacharts().length}px;border:none;overflow:hidden;"
          title="${iframeTitle}">
      </iframe>`;

    this.exportResult.style.display = "block";
    document.getElementById("exportCode").innerHTML = iframecode;

    this.exportdata = {
      blob: new Blob([iframecode], {
        type: "text/html",
      }),
      data: iframecode,
      filename: this.#generateFilename() + ".html",
      type: "text/html",
    };
  }

  protected async exportAsBlogElement() {
    if (this.#getActiveLineacharts().length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }
    const exports = this.getExportSettings();
    const resultsFiltered = await this.#generateInteractiveExportData();
    const dataUrl = await this.exportAllPlotsToPNG(
      { width: 750, heightPerCanvas: 200, title: this.#generateTitleString() },
      true,
    );
    if (!dataUrl) {
      return;
    }

    const serializedData = LineaExportModal.escapeHtmlAttribute(JSON.stringify(resultsFiltered));
    let html = `<div style="display: grid; width: 100%;" data-lineaplot-wrapper>
      <img style="grid-area: 1 / 1; pointer-events: none;" src="${dataUrl}"/>
      <linea-plot class="linea-custom-element" style="grid-area: 1 / 1; max-width: 100%; max-height: 100%; overflow: hidden;" data="${serializedData}" showsurfacehoarseries="" showtitle="" tabindex="0"></linea-plot>
    </div>`;

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot ", "<linea-plot showonlywinter");
    }
    const binary = LineaExportModal.toBinary(html);

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
      filename: this.#generateFilename() + ".txt",
      type: "text/plain",
    };
  }

  #reconstructPSUMSeries(cumulativePSUM: (number | null)[]): (number | null)[] {
    const reconstructed: (number | null)[] = [];
    for (let i = 0; i < cumulativePSUM.length; i++) {
      const current = cumulativePSUM[i];
      if (current == null) {
        reconstructed[i] = null;
        continue;
      }
      if (i === 0) {
        reconstructed[i] = current;
        continue;
      }
      const previous = cumulativePSUM[i - 1];
      if (previous == null) {
        reconstructed[i] = current;
        continue;
      }
      reconstructed[i] = current < previous ? current : current - previous;
    }
    return reconstructed;
  }

  /**
   * Generates a formatted title string from selected LineaCharts.
   *
   * Creates a title combining station names and altitudes separated by em-dashes.
   * Format: "Station1 (altitude1m) — Station2 (altitude2m) — ..."
   *
   * @private
   * @returns {string} The formatted title string
   */
  #generateTitleString(): string {
    const titles: { station: string; altitude: number }[] = [];
    for (const lineachart of this.#getActiveLineacharts()) {
      const station = lineachart.result.station;
      const altitude = lineachart.result.altitude;
      titles.push({ station, altitude });
    }
    let title = "";
    titles.forEach((t, i) => {
      title += t.station + " (" + t.altitude + "m)";
      if (!(titles.length == i + 1)) {
        title += " – ";
      }
    });
    return title;
  }

  /**
   * Generates a filename for the active, exported lineacharts using their title.
   * Format:
   * [Date of last timestamp]_[titles of stations]-[# Days]d
   * e.g. 20260212_Kapall-7d
   */
  #generateFilename(): string {
    const charts = this.#getActiveLineacharts();
    const titles = charts.map((c) => c.result.station);

    const timestamps: number[] = charts[0].result.timestamps.filter(Boolean);
    if (timestamps.length === 0) {
      return titles.join("_");
    }

    const firstTs = timestamps[0];
    const lastTs = timestamps.at(-1);

    const date = Temporal.Instant.fromEpochMilliseconds(lastTs).toZonedDateTimeISO(i18n.timezone());

    const dateString =
      date.year.toString().padStart(4, "0") +
      date.month.toString().padStart(2, "0") +
      date.day.toString().padStart(2, "0");

    const durationDays = Math.round((lastTs - firstTs) / 86_400_000);

    return `${dateString}_${titles.join("_")}-${durationDays}d`;
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
    const activeLinecharts = this.#getActiveLineacharts();
    if (activeLinecharts.length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return Promise.resolve("");
    }

    const canvases: HTMLCanvasElement[] = [];
    const series: uPlot.Series[] = [];
    const legendItems: Record<string, string> = {};

    const parentWidth =
      (width * this.lineaPlot.view.charts[0].clientWidth) /
      this.lineaPlot.view.charts[0].plots[0].root.querySelector("canvas").width;

    let oldBackgroundColor = "";
    if (activeLinecharts.length == 1) {
      oldBackgroundColor = activeLinecharts[0].getBackgroundColor();
      activeLinecharts[0].setBackgroundColor("#00000000");
    }
    // has to be done after background color change, because uPlot canvas is redrawn on background color change
    const initHeightPerCanvas = this.lineaPlot.view.charts[0].plots[0].height;
    for (const lineachart of this.lineaPlot.view.charts) {
      lineachart.resizeObserver.unobserve(lineachart);
      lineachart.resizePlots(parentWidth, lineachart.style, heightPerCanvas);
      await new Promise((r) => setTimeout(r, 1));
    }

    activeLinecharts.forEach((lineachart, index) => {
      const plotindices = this.getCheckedSeriesIndices(index);
      if (plotindices.length == 0) {
        return;
      }
      const plots: uPlot[] = lineachart.plots.filter((_v, i) => plotindices.includes(i));
      plots
        .map((p) => p.root.querySelector("canvas")!)
        .forEach((c) => {
          canvases.push(c);
        });
      plots.map((p) => series.push(...p.series.slice(1)));
      plots.map((p) =>
        p.series.slice(1).map((s, i) => {
          const label = s.label ?? `Series ${i + 1}`;
          let color = "#000000";
          if (typeof s.stroke === "string") {
            color = s.stroke;
          } else if (typeof s.stroke === "function") {
            const c = s.stroke(p, i + 1);
            if (typeof c === "string") color = c;
          }
          legendItems[String(label)] = color;
        }),
      );
    });

    if (Object.keys(legendItems).length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return Promise.resolve("");
    }

    const swatchSize = 18;
    const legendItemHeight = 22;
    const legendPadding = 20;
    const labelFontSize = 16;
    const legendLines: Array<{
      items: Array<{ label: string; color: string; width: number }>;
      startX: number;
    }> = [];
    //Calculate legend layout - try to fit as many items as possible into one line, then create new lines as needed.
    if (Object.keys(legendItems).length > 0) {
      const xStart = legendPadding * 2;

      const ctx = canvases[0].getContext("2d")!;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = labelFontSize + "px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

      let currentLine: Array<{ label: string; color: string; width: number }> = [];
      let currentLineWidth = 0;

      for (const [label, color] of Object.entries(legendItems)) {
        const textwidth = ctx.measureText(label).width;
        const itemWidth = swatchSize + 8 + textwidth + 10;

        if (currentLineWidth + itemWidth > canvases[0].width - legendPadding * 2) {
          if (currentLine.length > 0) {
            legendLines.push({ items: currentLine, startX: xStart });
            currentLine = [];
            currentLineWidth = 0;
          }
        }
        currentLine.push({ label, color: color as string, width: itemWidth });
        currentLineWidth += itemWidth;
      }

      if (currentLine.length > 0) {
        legendLines.push({ items: currentLine, startX: xStart });
      }
    }

    const titleHeight = title ? 40 : 0;
    const chartsHeight = canvases.reduce((sum, c) => sum + c.height, 0);
    const legendHeight = (legendLines.length * legendItemHeight * 3) / 2;
    const totalHeight = titleHeight + chartsHeight + legendHeight;
    const outputWidth = canvases[0].width;
    if (outputWidth * totalHeight > this.maxCanvasPixels) {
      alert(i18n.message("linea:message:exporttobig"));
      return Promise.resolve("");
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = outputWidth;
    outCanvas.height = totalHeight;

    //fill background
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "high";

    //draw title
    if (title) {
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      let fontSize = 24;
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;
      let titleWidth = ctx.measureText(title).width;

      // Reduce font size until title fits
      while (titleWidth > outCanvas.width - 40 && fontSize > 12) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;
        titleWidth = ctx.measureText(title).width;
      }
      ctx.fillText(title, outCanvas.width / 2, 18);
    }

    let y = titleHeight;
    for (const c of canvases) {
      ctx.drawImage(c, 0, y);
      y += c.height;
    }

    let lineIndex = 0;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = labelFontSize + "px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

    for (const line of legendLines) {
      const totalLineWidth = line.items.reduce((sum, item) => sum + item.width, 0);
      const centeredStartX = (outCanvas.width - totalLineWidth) / 2;

      let x = centeredStartX;
      for (const item of line.items) {
        // colored square
        ctx.fillStyle = item.color;
        ctx.fillRect(
          x,
          y + legendPadding + (lineIndex * legendItemHeight * 3) / 2 - swatchSize / 2,
          swatchSize,
          swatchSize,
        );

        // label
        ctx.fillStyle = "#000";
        ctx.fillText(
          item.label,
          x + swatchSize + 8,
          y + legendPadding + (lineIndex * legendItemHeight * 3) / 2,
        );
        x += item.width;
      }
      lineIndex++;
    }

    if (activeLinecharts.length == 1) {
      activeLinecharts[0].setBackgroundColor(oldBackgroundColor);
    }
    for (const lineachart of this.lineaPlot.view.charts) {
      lineachart.resizePlots(this.lineaPlot.clientWidth, lineachart.style, initHeightPerCanvas);
      lineachart.resizeObserver.observe(lineachart);
    }
    const dataUrl = outCanvas.toDataURL();
    if (!noshow) {
      outCanvas.toBlob((blobdata) => {
        this.exportdata = {
          blob: blobdata,
          data: dataUrl,
          filename: this.#generateFilename() + ".png",
          type: "image/png",
        };
      });
      document.getElementById("exportCode").innerHTML =
        `<img src="${dataUrl}" alt="Chart Preview" style="max-width: 100%; border: 1px solid #333; border-radius: 4px;"/>`;
      document.getElementById("exportResult").style.display = "block";
      return dataUrl;
    }
    return dataUrl;
  }

  /**
   * Retrieves all currently selected/active LineaCharts based on checkbox state.
   *
   * @private
   * @returns {AbstractLineaChart[]} Array of active AbstractLineaChart instances
   */
  #getActiveLineacharts(): AbstractLineaChart[] {
    const activeCharts: AbstractLineaChart[] = [];
    const indices = this.getCheckedDiagramIndices();
    let i = 0;
    for (const lineachart of this.lineaPlot.view.charts) {
      if (indices.includes(i)) {
        activeCharts.push(lineachart);
      }
      i += 1;
    }
    return activeCharts;
  }
}
