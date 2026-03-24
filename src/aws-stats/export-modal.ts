import uPlot from "uplot";
import { i18n } from "../i18n";
import css from "../shared/export-modal.css?inline";
import type { AbstractChart } from "./abstract-chart";

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
export class ExportModal {
  private exportSettings: HTMLDivElement;
  private exportResult: HTMLDivElement;
  private exportdata: { blob: Blob; data: string; filename: string; type: string } | null = null;
  readonly modal: HTMLDivElement;
  private chart: AbstractChart;
  public legend: boolean = true;

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
  constructor(modal: HTMLDivElement, chart: AbstractChart) {
    this.modal = modal;
    this.chart = chart;

    const styleTag = document.createElement("style");
    styleTag.textContent = css;
    this.modal.appendChild(styleTag);
    this.modal.classList.add("export-modal");
    this.modal.id = "exportModal";
    this.modal.insertAdjacentHTML(
      "beforeend",
      `<div class="export-modal-content">
                <span class="export-close" onclick="this.closest('.export-modal').style.display='none'">&times;</span>
                <h2>${i18n.message("chart:export:controls:label:exportchart")}</h2>
    
                <div class="export-options">
                    <div class="export-option" id="btnExportIframe" style="display: none;">
                        <h4>${i18n.message("chart:export:controls:button:iframe")}</h4>
                        <p>${i18n.message("chart:export:controls:button:iframe:sub")}</p>
                    </div>
    
                    <div class="export-option" id="btnExportPNG">
                        <h4>${i18n.message("chart:export:controls:button:pngimage")}</h4>
                        <p>${i18n.message("chart:export:controls:button:pngimage:sub")}</p>
                    </div>

                    <div class="export-option" id="btnExportInteractiveBlog" style="display: none;">
                        <h4>${i18n.message("chart:export:controls:button:interactiveblog")}</h4>
                        <p>${i18n.message("chart:export:controls:button:interactiveblog:sub")}</p>
                    </div>
                </div>
    
                <div class="export-settings" id="exportSettings" style="display:none;">
                    <h4>${i18n.message("chart:export:controls:label:exportsettings")}</h4>
                    <div style="display: grid; gap: 15px;">
                        <div id="exportSizes" style="display: none; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                          <div>
                              <label for="exportWidth">${i18n.message("chart:export:controls:label:width")} (px)</label>
                              <input type="number" id="exportWidth" value="1000" min="400" max="2600" step="100">
                          </div>
                          <div>
                              <label for="exportHeight">${i18n.message("chart:export:controls:label:heightpercanvas")} (px):</label>
                              <input type="number" id="exportHeight" value="200" min="150" max="600" step="50">
                          </div>
                          <div>
                              <label for="exportTitle">${i18n.message("chart:export:controls:label:title")}</label>
                              <input type="text" id="exportTitle" value="">
                          </div>
                        </div>
                    </div>
                </div>
    
                <div id="exportResult" style="display:none;">
                    <h3>${i18n.message("chart:export:controls:label:exportresult")}</h3>
                    <div class="code-container">
                        <div class="code-container-buttons">
                            <button class="copy-btn" id="copyExportBtn">${i18n.message("chart:export:controls:button:copytoclipboard")}</button>
                            <button class="dwn-btn" id="downloadBtn">${i18n.message("chart:export:controls:button:download")}</button>
                            <button class="open-btn" id="openBtn">${i18n.message("chart:export:controls:button:open")}</button>
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

    (this.modal.querySelector("#btnExportInteractiveBlog") as HTMLElement).addEventListener(
      "click",
      () => {
        this.#resetCopyToClipboardButton();
        this.#exportAsBlogElement();
      },
    );

    this.modal.querySelector("#btnExportIframe")?.addEventListener("click", () => {
      document.getElementById("exportSizes")!.style.display = "none";
      this.#resetCopyToClipboardButton();
      this.#exportAsIframe();
    });

    this.modal.querySelector("#btnExportPNG")?.addEventListener("click", () => {
      document.getElementById("exportSizes")!.style.display = "grid";
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
    const titleInput = this.modal.querySelector("#exportTitle") as HTMLInputElement | null;
    if (titleInput) {
      const titleFromDom = this.chart.plot?.root.querySelector(".u-title")?.textContent?.trim();
      const titleFromOpts = (this.chart.plot as unknown as { opts?: { title?: string } } | null)
        ?.opts?.title;
      const chartTitle = titleFromDom || titleFromOpts || "";
      titleInput.value = chartTitle;
    }
  }

  /**
   * Resets the copyToClipboard Button
   */
  #resetCopyToClipboardButton() {
    const btn = document.querySelector(".copy-btn") as HTMLButtonElement;
    btn.style.background = "#3498db";
    btn.innerText = i18n.message("chart:export:controls:button:copytoclipboard");
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
        "Couldn't save clipboard item, no matching content type " + this.exportdata!.type + "!",
      );
      return;
    }
    navigator.clipboard
      .write(code)
      .then(() => {
        const btn = document.querySelector(".copy-btn") as HTMLButtonElement;
        const originalText = btn.textContent;
        btn.textContent = `${i18n.message("chart:export:controls:button:copytoclipboard:clicked")}`;
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
   * Handles iframe export functionality.
   *
   * @private
   * @returns {void}
   * @todo Implement iframe export logic
   */
  async #exportAsIframe() {
    // to be implemented
  }

  async #exportAsBlogElement() {
    // to be implemented
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
    const canvases: HTMLCanvasElement[] = [];
    const series: uPlot.Series[] = [];
    const legendItems = {};

    const parentWidth =
      (width * this.chart.container.clientWidth) /
      this.chart.plot!.root.querySelector("canvas")!.width;

    const initHeightPerCanvas = this.chart.plot!.height;

    this.chart.resizeObserver.unobserve(this.chart.container);
    this.chart.resizePlot(parentWidth, this.chart.container.style, heightPerCanvas);
    await new Promise((r) => setTimeout(r, 1));

    canvases.push(this.chart.plot!.root.querySelector("canvas")!);
    series.push(...this.chart.plot!.series.slice(1));
    this.chart.plot!.series.slice(1).map((s, i) => {
      const label = s.label ?? `Series ${i + 1}`;
      let color = "#000000";
      if (typeof s.stroke === "string") {
        color = s.stroke;
      } else {
        const c = s.stroke(this.chart.plot, i + 1);
        if (typeof c === "string") color = c;
      }
      legendItems[label] = color;
    });

    if (Object.keys(legendItems).length == 0) {
      alert(i18n.message("chart:export:message:noplotselected"));
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
    //Calculate legend layout – try to fit as many items as possible into one line, then create new lines as needed.
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
    const legendHeight = this.legend ? (legendLines.length * legendItemHeight * 3) / 2 : 0;
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

    if (this.legend) {
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
    }
    this.chart.resizePlot(
      this.chart.container.clientWidth,
      this.chart.container.style,
      initHeightPerCanvas,
    );
    this.chart.resizeObserver.observe(this.chart.container);

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
