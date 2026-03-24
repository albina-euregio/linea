import uPlot from "uplot";
import { i18n } from "../i18n";
import { LineaPlot } from "../linea-plot";
import type { StationData } from "../data/station-data";
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
    super(modal);
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

    this.modal.querySelector("#exportDiagrams")!.innerHTML = this.lineaPlot.view.charts
      .map((chart, index) => {
        let options = "";
        chart.plotnames.forEach((name, i) => {
          options += `<label style="display: flex; align-items: center; margin-bottom: 0; font-weight: normal; white-space: nowrap;">
            <input type="checkbox" class="diagram-plot-checkbox-${index}" value="${i}" checked style="width: auto; margin-right: 8px; padding: 0; flex-shrink: 0;"/>
            ${name}
            </label>`;
        });

        return `
          <div style="display: flex; flex-direction: row; gap:20px;"><label style="display: flex; align-items: center; margin-bottom: 0; white-space: nowrap;">
              <input type="checkbox" class="diagram-checkbox" id="exportDiagram_${index}" value="${index}" checked style="width: auto; margin-right: 8px; padding: 0; flex-shrink: 0;"/>
              ${chart.result.station} (${chart.result.altitude}m)
          </label>${options}</div>
          `;
      })
      .join("");
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
  async #generateInteractiveExportData(): Promise<{
    resultsFiltered: StationData[];
    dataUrl: string;
  }> {
    const resultsFiltered: StationData[] = [];

    this.#getActiveLineacharts().forEach((lc, index) => {
      const activeplots = this.#getCheckedPlotIndices(index);
      let result: StationData = {
        station: lc.result.station,
        altitude: lc.result.altitude,
        timestamps: lc.result.timestamps,
        values: {},
        units: {},
      };
      if (this.lineaPlot.view instanceof WinterView) {
        activeplots.forEach((index) => {
          if (lc.plotnames[index] === i18n.message("linea:plotnames:temperature")) {
            result.values.TA = lc.result.values.TA ?? [];
            result.values.TD = lc.result.values.TD ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:newsnow")) {
            result.values.NS = lc.result.values.NS;
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:precipitation")) {
            result.values.HS = lc.result.values.HS ?? [];
            result.values.PSUM = lc.result.values.PSUM ?? [];
          }
        });
      } else {
        activeplots.forEach((index) => {
          if (lc.plotnames[index] === i18n.message("linea:plotnames:temperature")) {
            result.values.TA = lc.result.values.TA ?? [];
            result.values.TD = lc.result.values.TD ?? [];
            result.values.TSS = lc.result.values.TSS ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:wind")) {
            result.values.VW = lc.result.values.VW ?? [];
            result.values.VW_MAX = lc.result.values.VW_MAX ?? [];
            result.values.DW = lc.result.values.DW ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:humidity_gr")) {
            result.values.RH = lc.result.values.RH ?? [];
            result.values.ISWR = lc.result.values.ISWR ?? [];
          } else if (lc.plotnames[index] === i18n.message("linea:plotnames:precipitation")) {
            result.values.HS = lc.result.values.HS ?? [];
            result.values.PSUM = lc.result.values.PSUM ?? [];
          }
        });
      }
      resultsFiltered.push(result);
    });

    const dataUrl: string = await this.exportAllPlotsToPNG(
      { width: 750, heightPerCanvas: 200, title: this.#generateTitleString() },
      true,
    );
    return { resultsFiltered, dataUrl };
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

    const { resultsFiltered, dataUrl } = await this.#generateInteractiveExportData();

    const iframeTemplate = await import("./iframetemplate.html?raw").then((m) => m.default);
    let html = iframeTemplate
      .replace('lang="en"', `lang="${i18n.lang}"`)
      .replace('data=""', `data='${JSON.stringify(resultsFiltered)}'`)
      .replace('id="fallback" src=""', `id="fallback" src='${dataUrl}'`);

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot", "<linea-plot showonlywinter");
    }

    const binary = LineaExportModal.toBinary(html);

    let totalCanvases = 0;
    this.#getCheckedDiagramIndices().forEach((index) => {
      totalCanvases += this.#getCheckedPlotIndices(index).length;
    });

    const iframecode = `<iframe
          src="data:text/html;base64,${btoa(binary)}"
          frameborder="0"
          scrolling="no"
          style="width: 100%; height: ${(exports.heightPerCanvas + 50) * totalCanvases + 50 * this.#getActiveLineacharts().length}px;border:none;overflow:hidden;"
          title="${exports.title}">
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
    const { resultsFiltered, dataUrl } = await this.#generateInteractiveExportData();

    let html = `<div data-lineaplot-wrapper>
                    <img style="position: absolute; inset: 0; z-index: 1;" src="${dataUrl}"/>
                    <linea-plot style="position: absolute; inset: 0; z-index: 2;" data='${JSON.stringify(resultsFiltered)}' showsurfacehoarseries="" showtitle="" tabindex="0"></linea-plot>
                  </div>`;

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot ", "<linea-plot showonlywinter");
    }
    const binary = LineaExportModal.toBinary(html);

    let totalCanvases = 0;
    this.#getCheckedDiagramIndices().forEach((index) => {
      totalCanvases += this.#getCheckedPlotIndices(index).length;
    });

    const iframeshortcode = `[lineaplotblog height="${(exports.heightPerCanvas + 50) * totalCanvases + 50 * this.#getActiveLineacharts().length}px" title="${exports.title}"]data:text/html;base64,${btoa(binary)}[/lineaplotblog]`;

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
    const lastTs = timestamps[timestamps.length - 1];

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
      const plotindices = this.#getCheckedPlotIndices(index);
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

    const outCanvas = document.createElement("canvas");
    outCanvas.width = canvases[0].width;
    outCanvas.height = totalHeight;

    //fill background
    const ctx = outCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

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
    if (!noshow) {
      outCanvas.toBlob((blobdata) => {
        this.exportdata = {
          blob: blobdata,
          data: outCanvas.toDataURL(),
          filename: this.#generateFilename() + ".png",
          type: "image/png",
        };
      });
      document.getElementById("exportCode").innerHTML =
        `<img src="${outCanvas.toDataURL()}" alt="Chart Preview" style="max-width: 100%; border: 1px solid #333; border-radius: 4px;"/>`;
      document.getElementById("exportResult").style.display = "block";
    }
    return outCanvas.toDataURL();
  }

  /**
   * Retrieves all currently selected/active LineaCharts based on checkbox state.
   *
   * @private
   * @returns {AbstractLineaChart[]} Array of active AbstractLineaChart instances
   */
  #getActiveLineacharts(): AbstractLineaChart[] {
    const activeCharts: AbstractLineaChart[] = [];
    const indices = this.#getCheckedDiagramIndices();
    let i = 0;
    for (const lineachart of this.lineaPlot.view.charts) {
      if (indices.includes(i)) {
        activeCharts.push(lineachart);
      }
      i += 1;
    }
    return activeCharts;
  }

  #getCheckedPlotIndices(index: number): number[] {
    return this.#evaluateCheckboxes(`.diagram-plot-checkbox-${index}`);
  }

  /**
   * Gets the indices of checked diagram checkboxes.
   *
   * @private
   * @returns {number[]} Array of checked checkbox indices
   */
  #getCheckedDiagramIndices(): number[] {
    return this.#evaluateCheckboxes(".diagram-checkbox");
  }

  #evaluateCheckboxes(classname: string): number[] {
    const indices: number[] = [];
    const checkboxes = this.modal.querySelectorAll(classname) as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((cb) => {
      if (cb.checked) {
        indices.push(parseInt(cb.value));
      }
    });
    return indices;
  }
}
