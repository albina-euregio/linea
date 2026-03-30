import type uPlot from "uplot";
import { i18n } from "../i18n";
import css from "./export-modal.css?inline";
import { AbstractLineaChart } from "../abstract-linea-chart";
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
export abstract class AbstractExportModal {
  static escapeHtmlAttribute(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  protected exportSettings: HTMLDivElement;
  protected exportResult: HTMLDivElement;
  protected exportdata: { blob: Blob; data: string; filename: string; type: string } | null = null;
  readonly modal: HTMLDivElement;

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
   * @param {boolean} showInteractibeBlogExportOption - Whether to show the interactive blog export option
   */
  constructor(modal: HTMLDivElement, showInteractibeBlogExportOption: boolean = false) {
    this.modal = modal;

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
    const interactiveBlogExportOption = this.modal.querySelector(
      "#btnExportInteractiveBlog",
    ) as HTMLDivElement;
    interactiveBlogExportOption.style.display = showInteractibeBlogExportOption ? "block" : "none";

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

    (this.modal.querySelector("#exportWidth") as HTMLElement)!.addEventListener(
      "keydown",
      keyListener,
    );
    (this.modal.querySelector("#exportHeight") as HTMLElement)!.addEventListener(
      "keydown",
      keyListener,
    );

    this.modal.querySelector("#btnExportSmet")!.addEventListener("click", () => {
      this.exportAsSMET();
    });

    this.modal.querySelector("#btnExportIframe")?.addEventListener("click", () => {
      document.getElementById("exportSizes")!.style.display = "none";
      this.resetCopyToClipboardButton();
      this.exportAsIframe();
    });

    this.modal.querySelector("#btnExportPNG")?.addEventListener("click", () => {
      document.getElementById("exportSizes")!.style.display = "grid";
      this.resetCopyToClipboardButton();
      this.exportAllPlotsToPNG(this.getExportSettings());
    });

    this.modal.querySelector("#btnExportInteractiveBlog")?.addEventListener("click", () => {
      document.getElementById("exportSizes")!.style.display = "none";
      this.resetCopyToClipboardButton();
      this.exportAsBlogElement();
    });

    this.modal.querySelector("#copyExportBtn")?.addEventListener("click", () => {
      this.copyToClipboard();
    });

    this.modal.querySelector("#downloadBtn")?.addEventListener("click", () => {
      this.downloadExport();
    });

    this.modal.querySelector("#openBtn")?.addEventListener("click", () => {
      this.openExport();
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
   * @abstract
   * @returns {void}
   */
  abstract show(): void;

  protected addDiagramsToExportSettings(plots: (uPlot | AbstractLineaChart)[]) {
    this.modal.querySelector("#exportDiagrams")!.innerHTML = plots
      .map((plot, index) => {
        let title = "";
        if (plot instanceof AbstractLineaChart) {
          title = `${plot.result.station} (${plot.result.altitude}m)`;
        } else {
          const titleFromDom = plot?.root.querySelector(".u-title")?.textContent?.trim();
          const titleFromOpts = (plot as unknown as { opts?: { title?: string } } | null)?.opts
            ?.title;
          title = titleFromDom || titleFromOpts || `Chart ${index + 1}`;
        }

        const labels: string[] = [];
        if (plot instanceof AbstractLineaChart) {
          plot.plotnames.forEach((name) => {
            labels.push(name);
          });
        } else {
          const series = plot?.series ?? [];
          series.slice(1).forEach((s, i) => {
            labels.push((s.label as string) ?? `Series ${i + 1}`);
          });
        }
        const seriesCheckboxes = labels
          .map((label, i) => {
            const seriesIndex = plot instanceof AbstractLineaChart ? i : i + 1;
            return `<label style="display: flex; align-items: center; margin-bottom: 0; font-weight: normal; white-space: nowrap;">
          <input type="checkbox" class="diagram-series-checkbox-${index}" value="${seriesIndex}" checked style="width: auto; margin-right: 8px; padding: 0; flex-shrink: 0;"/>
          ${label ?? `Series ${seriesIndex}`}
          </label>`;
          })
          .join("");

        return `
          <div style="display: flex; flex-direction: row; gap:20px; align-items: flex-start;">
            <label style="display: flex; align-items: center; margin-bottom: 0; white-space: nowrap;">
              <input type="checkbox" class="diagram-checkbox" id="exportDiagram_${index}" value="${index}" checked style="width: auto; margin-right: 8px; padding: 0; flex-shrink: 0;"/>
              ${title}
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 12px;">${seriesCheckboxes}</div>
          </div>
        `;
      })
      .join("");

    this.modal.querySelectorAll(".diagram-checkbox").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const checkbox = e.currentTarget as HTMLInputElement;
        const chartIndex = Number(checkbox.value);
        this.modal
          .querySelectorAll(`.diagram-series-checkbox-${chartIndex}`)
          .forEach((seriesCheckbox) => {
            (seriesCheckbox as HTMLInputElement).disabled = !checkbox.checked;
          });
      });
    });
  }

  protected getCheckedDiagramIndices(): number[] {
    return Array.from(this.modal.querySelectorAll(".diagram-checkbox:checked"))
      .map((cb) => parseInt((cb as HTMLInputElement).value, 10))
      .filter((n) => Number.isFinite(n));
  }

  protected getCheckedSeriesIndices(chartIndex: number): number[] {
    return Array.from(this.modal.querySelectorAll(`.diagram-series-checkbox-${chartIndex}:checked`))
      .map((cb) => parseInt((cb as HTMLInputElement).value, 10))
      .filter((n) => Number.isFinite(n));
  }

  protected hideAllSeriesSelectionCheckboxes() {
    this.modal.querySelectorAll('[class^="diagram-series-checkbox-"]').forEach((checkbox) => {
      const label = checkbox.closest("label") as HTMLLabelElement | null;
      if (label) {
        label.style.display = "none";
      }
    });
  }

  protected showAllSeriesSelectionCheckboxes() {
    this.modal.querySelectorAll('[class^="diagram-series-checkbox-"]').forEach((checkbox) => {
      const label = checkbox.closest("label") as HTMLLabelElement | null;
      if (label) {
        label.style.display = "block";
      }
    });
  }

  /**
   * Resets the copyToClipboard Button
   */
  protected resetCopyToClipboardButton() {
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
  protected copyToClipboard() {
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
  protected downloadExport() {
    if (!this.exportdata) {
      return;
    }
    this.download(URL.createObjectURL(this.exportdata.blob));
  }

  protected download(url: string, download: string = this.exportdata?.filename ?? "file.txt") {
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
  protected openExport() {
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
   * per default not implemented!
   */
  protected exportAsSMET() {}

  /**
   * Handles iframe export functionality.
   *
   * @private
   * @returns {void}
   * @todo Implement iframe export logic
   */
  protected async exportAsIframe() {
    // to be implemented
  }

  protected async exportAsBlogElement() {
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
  protected async exportAllPlotsToPNG(_: {
    width: number;
    heightPerCanvas: number;
    title: string;
  }): Promise<string> {
    return Promise.resolve("");
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
  protected getExportSettings() {
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
  static toBinary(s: string): string {
    const uint8Array = new TextEncoder().encode(s);
    let binary = "";
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return binary;
  }
}
