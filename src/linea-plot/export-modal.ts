import uPlot from "uplot";
import { i18n } from "../i18n";
import { LineaPlot } from "../linea-plot";
import type { Result } from "../data/station-data";
import { AbstractLineaChart } from "./abstract-linea-chart";
import css from "./export-modal.css?inline";
import { WinterView } from "./winter-view";

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
export class ExportModal {
  private exportSettings: HTMLDivElement;
  private exportResult: HTMLDivElement;
  private exportdata: { blob: Blob; data: string; filename: string; type: string } | null = null;
  readonly modal: HTMLDivElement;
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
    this.modal = modal;
    this.lineaPlot = lineaPlot;

    const styleTag = document.createElement("style");
    styleTag.textContent = css;
    this.modal.appendChild(styleTag);
    this.modal.classList.add("export-modal");
    this.modal.id = "exportModal";
    this.modal.insertAdjacentHTML(
      "beforeend",
      `<div class="export-modal-content">
                <span class="export-close" onclick="this.closest('.export-modal').style.display='none'">&times;</span>
                <h2>${i18n.message("linea:controls:label:exportchart")}</h2>
    
                <div class="export-options">
                    <div class="export-option" id="btnExportIframe">
                        <h4>${i18n.message("linea:controls:button:iframe")}</h4>
                        <p>${i18n.message("linea:controls:button:iframe:sub")}</p>
                    </div>
    
                    <div class="export-option" id="btnExportPNG">
                        <h4>${i18n.message("linea:controls:button:pngimage")}</h4>
                        <p>${i18n.message("linea:controls:button:pngimage:sub")}</p>
                    </div>

                    <div class="export-option" id="btnExportInteractiveBlog" style="display: none;">
                        <h4>${i18n.message("linea:controls:button:interactiveblog")}</h4>
                        <p>${i18n.message("linea:controls:button:interactiveblog:sub")}</p>
                    </div>

                    <div class="export-option" id="btnExportSmet">
                        <h4>${i18n.message("linea:controls:button:smet")}</h4>
                        <p>${i18n.message("linea:controls:button:smet:sub")}</p>
                    </div>
                </div>
    
                <div class="export-settings" id="exportSettings" style="display:none;">
                    <h4>${i18n.message("linea:controls:label:exportsettings")}</h4>
                    <div style="display: grid; gap: 15px;">
                        <div id="exportSizes" style="display: none; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                          <div>
                              <label for="exportWidth">${i18n.message("linea:controls:label:width")} (px)</label>
                              <input type="number" id="exportWidth" value="1000" min="400" max="2600" step="100">
                          </div>
                          <div>
                              <label for="exportHeight">${i18n.message("linea:controls:label:heightpercanvas")} (px):</label>
                              <input type="number" id="exportHeight" value="200" min="150" max="600" step="50">
                          </div>
                          <div>
                              <label for="exportTitle">${i18n.message("linea:controls:label:title")}</label>
                              <input type="text" id="exportTitle" value="">
                          </div>
                        </div>
                        <div>
                            <label for="exportDiagrams">${i18n.message("linea:controls:label:selectdiagrams")}</label>
                            <div class="exportDiagrams" id="exportDiagrams" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                            </div>
                        </div>
                    </div>
                </div>
    
                <div id="exportResult" style="display:none;">
                    <h3>${i18n.message("linea:controls:label:exportresult")}</h3>
                    <div class="code-container">
                        <div class="code-container-buttons">
                            <button class="copy-btn" id="copyExportBtn">${i18n.message("linea:controls:button:copytoclipboard")}</button>
                            <button class="dwn-btn" id="downloadBtn">${i18n.message("linea:controls:button:download")}</button>
                            <button class="open-btn" id="openBtn">${i18n.message("linea:controls:button:open")}</button>
                        </div>
                        <pre id="exportCode"></pre>
                    </div>
                </div>
            </div>`,
    );

    this.exportSettings = this.modal.querySelector("#exportSettings") as HTMLDivElement;
    this.exportResult = this.modal.querySelector("#exportResult") as HTMLDivElement;

    const keyListener = (e: KeyboardEvent) => {
      if (!this.exportdata || e.key !== "Enter") {
        return;
      }
      if (this.exportdata.type == "image/png") {
        (this.modal.querySelector("#btnExportPNG") as HTMLButtonElement).click();
      } else if (this.exportdata.type == "text/html") {
        (this.modal.querySelector("#btnExportIframe") as HTMLButtonElement).click();
      }
    };

    this.modal.querySelector("#exportWidth")?.addEventListener("keydown", keyListener);
    this.modal.querySelector("#exportHeight")?.addEventListener("keydown", keyListener);

    if (this.lineaPlot.hasAttribute("showinteractiveblogexport")) {
      (this.modal.querySelector("#btnExportInteractiveBlog") as HTMLElement).style.display = "grid";
      (this.modal.querySelector("#btnExportInteractiveBlog") as HTMLElement).addEventListener(
        "click",
        () => {
          this.#resetCopyToClipboardButton();
          this.#exportAsBlogElement();
        },
      );
    }

    this.modal.querySelector("#btnExportSmet")?.addEventListener("click", () => {
      this.#exportAsSMET();
    });

    this.modal.querySelector("#btnExportIframe")?.addEventListener("click", () => {
      document.getElementById("exportSizes").style.display = "none";
      this.#resetCopyToClipboardButton();
      this.#exportAsIframe();
    });

    this.modal.querySelector("#btnExportPNG")?.addEventListener("click", () => {
      document.getElementById("exportSizes").style.display = "grid";
      this.#resetCopyToClipboardButton();
      this.#exportAllPlotsToPNG(this.#getExportSettings());
    });

    this.modal.querySelector("#copyExportBtn")?.addEventListener("click", () => {
      this.#copyToClipboard();
    });

    this.modal.querySelector("#downloadBtn")?.addEventListener("click", () => {
      this.#downloadExport();
    });

    this.modal.querySelector("#openBtn")?.addEventListener("click", () => {
      this.#openExport();
    });

    // Close modal when clicking outside
    window.onclick = function (event) {
      const modal = document.getElementById("exportModal");
      if (event.target === modal && modal) {
        modal.style.display = "none";
      }
    };
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
   * Resets the copyToClipboard Button
   */
  #resetCopyToClipboardButton() {
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;
    btn.style.background = "#3498db";
    btn.innerText = i18n.message("linea:controls:button:copytoclipboard");
  }

  /**
   * Copies the exported content to the system clipboard.
   *
   * Supports copying both PNG images and HTML content formats.
   * Provides visual feedback by temporarily changing the button text and color.
   * Provides for content type of text/html a text/plain fallback, generated from the exportdata.data
   *
   * @private
   * @returns {void}
   * @throws {Error} Logs error if clipboard write operation fails
   */
  #copyToClipboard() {
    let code: ClipboardItem[] = [];
    if (this.exportdata) {
      if (this.exportdata.type === "image/png") {
        code = [
          new ClipboardItem({
            ["image/png"]: this.exportdata.blob,
          }),
        ];
      } else if (this.exportdata.type === "text/html") {
        code = [
          new ClipboardItem({
            ["text/html"]: this.exportdata.blob,
            ["text/plain"]: new Blob([this.exportdata.data], { type: "text/plain" }),
          }),
        ];
      } else if (this.exportdata.type === "text/plain") {
        code = [
          new ClipboardItem({
            ["text/plain"]: this.exportdata.blob,
          }),
        ];
      }
    } else {
      console.error(
        "Couldn't save clipboard item, no matching content type " + this.exportdata.type + "!",
      );
      return;
    }
    navigator.clipboard
      .write(code)
      .then(() => {
        const btn = document.querySelector(".copy-btn") as HTMLButtonElement;
        const originalText = btn.textContent;
        btn.textContent = `${i18n.message("linea:controls:button:copytoclipboard:clicked")}`;
        btn.style.background = "#27ae60";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = "#667eea";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }

  /**
   * Downloads the exported file to the user's local system.
   *
   * @private
   * @returns {void}
   */
  #downloadExport() {
    if (!this.exportdata) {
      return;
    }
    this.#download(URL.createObjectURL(this.exportdata.blob));
  }

  #download(url: string, download: string = this.exportdata?.filename ?? "file.txt") {
    const a = document.createElement("a");
    a.href = url;
    a.download = download;
    a.target = "_tab";
    a.click();
  }

  /**
   * Opens the exported content in a new browser tab.
   *
   * Creates a temporary anchor element and opens the exported data
   * in a new tab using the data URL or blob reference.
   *
   * @private
   * @returns {void}
   */
  #openExport() {
    if (!this.exportdata) {
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(this.exportdata.blob);
    a.target = "_blank";
    a.click();
  }

  /**
   * Downloads all available SMET files
   */
  #exportAsSMET() {
    this.#downloadSMETS(this.lineaPlot.view.srcs);
  }

  async #downloadSMETS(srcs: string[]) {
    for (const src of srcs) {
      this.#download(src, src.split("/")[-1]);
      await new Promise(requestAnimationFrame);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  /**
   * Generates the code which can be included into an iframe.
   * @returns Promise<string> - html code to insert into an iframe
   */
  async #generateInteractiveExportData(): Promise<{ resultsFiltered: Result[]; dataUrl: string }> {
    const resultsFiltered: Result[] = [];

    this.#getActiveLineacharts().forEach((lc, index) => {
      const activeplots = this.#getCheckedPlotIndices(index);
      let result: Result = {
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

    const dataUrl: string = await this.#exportAllPlotsToPNG(
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
  async #exportAsIframe() {
    if (this.#getActiveLineacharts().length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }
    const exports = this.#getExportSettings();

    const { resultsFiltered, dataUrl } = await this.#generateInteractiveExportData();

    const iframeTemplate = await import("./iframetemplate.html?raw").then((m) => m.default);
    let html = iframeTemplate
      .replace('lang="en"', `lang="${i18n.lang}"`)
      .replace('data=""', `data='${JSON.stringify(resultsFiltered)}'`)
      .replace('id="fallback" src=""', `id="fallback" src='${dataUrl}'`);

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot", "<linea-plot showonlywinter");
    }

    const binary = ExportModal.#toBinary(html);

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

  async #exportAsBlogElement() {
    if (this.#getActiveLineacharts().length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }
    const exports = this.#getExportSettings();
    const { resultsFiltered, dataUrl } = await this.#generateInteractiveExportData();

    let html = `<div data-lineaplot-wrapper>
                    <img style="position: absolute; inset: 0; z-index: 1;" src="${dataUrl}"/>
                    <linea-plot style="position: absolute; inset: 0; z-index: 2;" data='${JSON.stringify(resultsFiltered)}' showsurfacehoarseries="" showtitle="" tabindex="0"></linea-plot>
                  </div>`;

    if (this.lineaPlot.view instanceof WinterView) {
      html = html.replace("<linea-plot ", "<linea-plot showonlywinter");
    }
    const binary = ExportModal.#toBinary(html);

    let totalCanvases = 0;
    this.#getCheckedDiagramIndices().forEach((index) => {
      totalCanvases += this.#getCheckedPlotIndices(index).length;
    });

    const iframeshortcode = `[lineaplotblog height="${(exports.heightPerCanvas + 50) * totalCanvases + 50 * this.#getActiveLineacharts().length}px" title="${exports.title}"]data:text/html;base64,${btoa(binary)}[/lineaplotblog]`;

    this.exportResult.style.display = "block";
    document.getElementById("exportCode").innerHTML = `<p>${iframeshortcode}</p>`;
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
  async #exportAllPlotsToPNG(
    { width, heightPerCanvas, title }: { width: number; heightPerCanvas: number; title: string },
    noshow: boolean = false,
  ) {
    const activeLinecharts = this.#getActiveLineacharts();
    if (activeLinecharts.length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
    }

    const canvases: HTMLCanvasElement[] = [];
    const series: uPlot.Series[] = [];
    const legendItems = {};

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
          } else {
            const c = s.stroke(p, i + 1);
            if (typeof c === "string") color = c;
          }
          legendItems[label] = color;
        }),
      );
    });

    if (Object.keys(legendItems).length == 0) {
      alert(i18n.message("linea:message:noplotselected"));
      return;
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
        currentLine.push({ label, color, width: itemWidth });
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

  /**
   * Retrieves the current export settings from the modal input fields.
   *
   * @private
   * @returns {Object} Export settings object
   * @returns {number} return.width - Export width in pixels
   * @returns {number} return.height - Export height per canvas in pixels
   * @returns {string} return.title - Export title text
   */
  #getExportSettings() {
    const widthInput = document.getElementById("exportWidth") as HTMLInputElement;
    const heightInput = document.getElementById("exportHeight") as HTMLInputElement;
    const titleInput = document.getElementById("exportTitle") as HTMLInputElement;
    return {
      width: parseInt(widthInput.value),
      heightPerCanvas: parseInt(heightInput.value),
      title: titleInput.value,
    };
  }

  /**
   * Converts a string to binary
   *
   * @param s string to convert
   * @returns converted string to binary
   */
  static #toBinary(s: string): string {
    const uint8Array = new TextEncoder().encode(s);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return binary;
  }
}
