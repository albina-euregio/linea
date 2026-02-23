import { i18n } from "./i18n";
import { AbstractLineaChart } from "./linea-plot/abstract-linea-chart";
import { LineaYearChart } from "./linea-plot/linea-year-chart";
import type { ExportModal } from "./linea-plot/export-modal";
import type AirDatepicker from "air-datepicker";
import css from "./linea-plot.css?inline";
import cssuPlot from "uplot/dist/uPlot.min.css?raw";
import { WinterView } from "./linea-plot/winter-view";
import type { LineaView } from "./linea-plot/linea-view";
import { StationView } from "./linea-plot/station-view";
/**
 * LineaPlot Web Component
 * 
 * A custom HTML element for displaying and filtering SMET (Standard Meteorological Exchange Format) data
 * with interactive date range selection and multi-station chart visualization. Plotting it accordingly to the EAWS workgroup.

 * 
 * @element linea-plot
 * 
 * @attributes
 * - `data` {string} - JSON-encoded array of @class Result objects (optional, either this or the `src` attribute)
 * - `src` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from (optional, either this or the `data` attribute)
 * - `lazysrc` {string} - JSON-encoded array (or single url) of SMET file URLs to lazy fetch data from after loading the component and the data from `src` (optional)
 * - `wintersrc` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch winter data from (optional)
 * - `showonlywinter` {string} - When present, just the winter view is shown. Just in combination with `wintersrc`.
 * - `showdatepicker` {boolean} - When present, displays date range picker controls for filtering data
 * - `showtitle` {boolean} - When present, display the station name and altitude as title
 * - `backgroundcolors` {string} - JSON-encoded array with colorcodes for the background color in the plots, same order as the SMET files.
 *    If there are more SMET files than colorcodes for the other stations there is no background color set. Per default the first station is set in light grey, if there is more than one.
 * - `showsurfacehoarseries` {boolean} - When present, display a series which shows the surface hoar potential
 * - `showexport` - toggles if the export button is shown
 * - `showinteractiveblogexport` - toggles if the export for the interactive blog button is shown, just in combination with `showexport`
 * 
 * 
 * @example
 * ```html
 * <!-- Display all data with date picker -->
 * <linea-plot 
 *   src='["data/station1.smet", "data/station2.smet"]'
 *   backgroundcolors = '["#b31c1c2b", "rgba(0, 0, 0, 0.05)"]'
 *   showdatepicker
 *   showsurfacehoarseries
 *   showtitle
 *   showexport>
 * </linea-plot>
 * 
 * <!-- Fixed date view without picker -->
 * <linea-plot 
 *   src='["data/station1.smet"]'
 *   wintersrc='["data/station1_winter.smet"]'>
 * </linea-plot>
 * ```
 * 
 * @features
 * - Multi-source data fetching and aggregation
 * - Automatic data generalization across multiple stations with different time ranges
 * - Interactive date range filtering with datetime-local inputs
 * - Fixed date view mode for static data display
 * - Timezone-aware date handling based on browser settings
 * - uPlot-based chart rendering with customizable background styling
 * - Null value handling for missing data points
 * - Export charts as png
 * - Automatic calculations of surface hoar potential if data is present
 * - Showing a overview over the winter
 */
export class LineaPlot extends HTMLElement {
  static observedAttributes = ["src"];
  private isLoaded: boolean = false;

  private exportModal!: ExportModal;
  private daterange!: HTMLInputElement;
  private styleTag!: HTMLStyleElement;
  view!: LineaView;
  private lineaViews!: Map<string, LineaView>;

  //AirDatePicker, never name it datepicker, it causes a lot of trouble!!!!!
  public dp: AirDatepicker | undefined;

  private backgroundColors = ["rgba(0, 0, 0, 0.05)"];

  async connectedCallback() {
    this.styleTag = document.createElement("style");

    this.styleTag.textContent = [css, cssuPlot].join(" ");
    this.append(this.styleTag);
    await this.#addControls();
    this.#addExportModal();

    this.#loadViews();

    this.tabIndex = 0;
    this.focus();
    this.isLoaded = true;
  }

  attributeChangedCallback(name: string) {
    if (!this.isLoaded) {
      return;
    }
    if (name === "src") {
      this.#loadViews();
    }
  }

  /**
   * Reload all views with the new data from updated attributes
   */
  async #loadViews(): Promise<void> {
    if (this.view) {
      for (const chart of this.view.getCharts()) {
        this.removeChild(chart);
      }
    }

    this.lineaViews = new Map();
    this.lineaViews.set("station", new StationView(this.backgroundColors, this));
    if (this.hasAttribute("wintersrc") || this.hasAttribute("showonlywinter")) {
      this.lineaViews.set("winter", new WinterView(this.backgroundColors, this));
    }

    if (this.hasAttribute("showonlywinter")) {
      this.view = this.lineaViews.get("winter")!;
    } else {
      this.view = this.lineaViews.get("station")!;
    }

    await this.view.initialize();
    this.view.show();
  }

  /**
   * Get the current view key
   */
  #getCurrentViewKey(): string {
    for (const [key, view] of this.lineaViews.entries()) {
      if (view === this.view) {
        return key;
      }
    }
    return "station";
  }

  /**
   * Switch to view
   */
  async #switchView(viewkey: string): Promise<void> {
    const view = this.lineaViews.get(viewkey);
    if (!view) {
      throw new Error(viewkey + " view not available");
    }

    this.view.onSwitchFrom();
    for (const chart of this.view.getCharts()) {
      if (this.contains(chart)) {
        this.removeChild(chart);
      }
    }

    const needsInitialization = view.results.length === 0;
    this.view = view;

    if (needsInitialization) {
      await view.initialize();
    }
    view.show();
    view.onSwitchTo();

    this.updateValidDateInputs();
  }

  /**
   * Adds the exportmodal to the DOM and to this object.
   */
  async #addExportModal() {
    if (!this.hasAttribute("showexport")) {
      return;
    }
    const { ExportModal } = await import("./linea-plot/export-modal");
    this.exportModal = new ExportModal(document.createElement("div"), this);
    this.appendChild(this.exportModal.modal);
  }

  /**
   * Adds the controls to the Plot:
   * - Datepicker with (previous|startDate|endDate|next)
   * - Menu buttons with (export) (winterstats)
   *
   * export exports the drawed canvas on the screen, see @class ExportModal
   * winterstats show the overview of the year, see @class LineaYearChart
   */
  async #addControls() {
    if (!this.hasAttribute("showdatepicker") && !this.hasAttribute("showexport")) {
      return;
    }
    const controls = document.createElement("div");
    controls.classList.add("controls");

    if (this.hasAttribute("showdatepicker")) {
      const controlsdates = document.createElement("div");
      controlsdates.classList.add("controls-dates");
      controls.appendChild(controlsdates);

      this.daterange = document.createElement("input");
      this.daterange.type = "text";
      this.daterange.id = "daterangeinput";
      this.daterange.classList.add("toggle-btn");
      this.daterange.classList.add("dpclass");

      const previous = document.createElement("button");
      previous.classList.add("toggle-btn");
      previous.classList.add("controls-dates-inputs");
      previous.classList.add("linea-tooltip");
      previous.innerHTML = `&larr;<span class='linea-tooltiptext'>${i18n.message("linea:controls:tooltips:previous")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          previous.click();
        }
      });
      previous.addEventListener("click", () => {
        this.view.previous(previous, next);
      });
      const next = document.createElement("button");
      next.classList.add("toggle-btn");
      next.classList.add("controls-dates-inputs");
      next.classList.add("linea-tooltip");
      next.innerHTML = `&rarr;<span class='linea-tooltiptext'>${i18n.message("linea:controls:tooltips:next")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          next.click();
        }
      });
      next.addEventListener("click", () => {
        this.view.next(previous, next);
      });
      controlsdates.appendChild(previous);
      controlsdates.appendChild(this.daterange);
      controlsdates.appendChild(next);
    }
    const menu = document.createElement("div");
    menu.classList.add("controls-menu");
    if (this.hasAttribute("showexport")) {
      const exportbtn = document.createElement("button");
      exportbtn.innerHTML = `${i18n.message("linea:controls:value:export")}`;
      exportbtn.classList.add("toggle-btn");
      exportbtn.addEventListener("click", () => {
        if (this.view.charts.length == 0) {
          alert(i18n.message("linea:message:noplotselected"));
          return;
        }
        this.exportModal.show();
      });
      menu.appendChild(exportbtn);
    }
    if (this.hasAttribute("wintersrc") && !this.hasAttribute("showonlywinter")) {
      const winterviewbtn = document.createElement("button");
      winterviewbtn.id = "winterviewbtn";
      winterviewbtn.classList.add("toggle-btn");
      winterviewbtn.classList.add("winterview-btn");
      winterviewbtn.setAttribute("aria-busy", "false");
      winterviewbtn.setAttribute("type", "button");

      const label = document.createElement("span");
      label.className = "winterview-btn-label";
      label.textContent = i18n.message("linea:controls:value:winterview:winter");

      const loader = document.createElement("span");
      loader.className = "winterview-btn-loader";
      loader.setAttribute("aria-hidden", "true");

      const spinner = document.createElement("span");
      spinner.className = "winterview-btn-spinner";
      loader.appendChild(spinner);

      winterviewbtn.append(label, loader);
      winterviewbtn.addEventListener("click", () => {
        if (winterviewbtn.classList.contains("loading")) return;

        winterviewbtn.classList.add("loading");
        winterviewbtn.disabled = true;

        const currentViewKey = this.#getCurrentViewKey();
        if (currentViewKey === "station") {
          this.#switchView("winter").then(() => {
            winterviewbtn.classList.remove("loading");
            winterviewbtn.disabled = false;
            label.textContent = i18n.message("linea:controls:value:winterview:station");
          });
        } else {
          this.#switchView("station");
          winterviewbtn.classList.remove("loading");
          winterviewbtn.disabled = false;
          label.textContent = i18n.message("linea:controls:value:winterview:winter");
        }
      });
      menu.appendChild(winterviewbtn);
    }
    if (this.hasAttribute("showdatepicker")) {
      const enlargebtn = document.createElement("button");
      enlargebtn.innerHTML = `<svg width="13px" height="13px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polyline data-name="Right" fill="none" id="Right-2" points="3 17.3 3 21 6.7 21" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        <line fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="10" x2="3.8" y1="14" y2="20.2"/>
        <line fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="14" x2="20.2" y1="10" y2="3.8"/>
        <polyline data-name="Right" fill="none" id="Right-3" points="21 6.7 21 3 17.3 3" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg><span class="linea-tooltiptext">${i18n.message("linea:controls:tooltips:wholetimespan")}</span>`;
      enlargebtn.classList.add("toggle-btn");
      enlargebtn.classList.add("linea-tooltip");
      enlargebtn.addEventListener("click", () => {
        this.setStartEndDateToMinMax();
        this.view.filterAndUpdateData();
      });
      // menu.appendChild(enlargebtn);
    }
    controls.appendChild(menu);
    this.appendChild(controls);

    await this.#constructDatePicker();
    this.focus();
  }

  /**
   * sets the valid data range to the startDate and endDate inputs
   * @returns
   */
  updateValidDateInputs() {
    if (!this.dp) {
      return;
    }
    const minTime = Temporal.Instant.fromEpochMilliseconds(this.view.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxTime = Temporal.Instant.fromEpochMilliseconds(this.view.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    this.#updateDatePickerMinMax(minTime, maxTime);
  }

  /**
   *
   * set the Input fields to the widthest available timespan
   */
  setStartEndDateToMinMax() {
    if (!this.daterange || !this.dp) {
      return;
    }
    const minDate = Temporal.Instant.fromEpochMilliseconds(this.view.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxDate = Temporal.Instant.fromEpochMilliseconds(this.view.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    this.#updateDatepickerStartEndDate(minDate, maxDate);
  }

  /**
   * Set the start and endate in the datepicker to the given values
   * values are given in UTC epoch milliseconds
   *
   */
  setStartEndDateTo(min: number, max: number) {
    if (!this.dp || !this.daterange) {
      return;
    }
    const startDate = Temporal.Instant.fromEpochMilliseconds(min).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const endDate = Temporal.Instant.fromEpochMilliseconds(max).toZonedDateTimeISO(i18n.timezone());
    this.#updateDatepickerStartEndDate(startDate, endDate);
  }

  /**
   * Converts a ZonedDateTime to a Date
   * @param value Temporal.ZonedDateTime to convert
   * @returns a Date Object
   */
  #zonedDateTimeToDate(value: Temporal.ZonedDateTime): Date {
    // Get the Instant from the ZonedDateTime and return a Date
    return new Date(value.toInstant().toString());
  }

  #updateDatepickerStartEndDate(
    startDate: Temporal.ZonedDateTime,
    endDate: Temporal.ZonedDateTime,
  ) {
    this.dp.selectDate([this.#zonedDateTimeToDate(startDate), this.#zonedDateTimeToDate(endDate)]);
  }

  #updateDatePickerMinMax(minDate: Temporal.ZonedDateTime, maxDate: Temporal.ZonedDateTime) {
    this.dp.update({
      minDate: this.#zonedDateTimeToDate(minDate),
      maxDate: this.#zonedDateTimeToDate(maxDate),
    });
  }

  /**
   * cosntructs the AirDatePicker
   */
  async #constructDatePicker() {
    const { default: AirDatepicker } = await import("air-datepicker");
    const css = await import("air-datepicker/air-datepicker.css?raw");
    this.styleTag.textContent += css.default;

    this.dp = new AirDatepicker(this.daterange, {
      range: true,
      multipleDatesSeparator: " - ",
      container: this,
      autoClose: true,
    });
    await this.#localizeDatePicker();
    //AirDatepicker on mobile devices has problems with focusing the input field, so we add a touchstart listener
    this.daterange.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.dp.visible) {
        this.dp.hide();
      } else {
        this.dp.show();
      }
    });
  }

  /**
   * Localizes the AirDatepicker
   */
  async #localizeDatePicker() {
    let locale;
    switch (i18n.lang) {
      case "en":
        locale = (await import("air-datepicker/locale/en")).default.default; // English
        break;
      case "ca":
        locale = (await import("air-datepicker/locale/ca")).default.default; // Catalan
        break;
      case "de":
        locale = (await import("air-datepicker/locale/de")).default.default; // German
        break;
      case "es":
        locale = (await import("air-datepicker/locale/es")).default.default; // Spanish
        break;
      case "fr":
        locale = (await import("air-datepicker/locale/fr")).default.default; // French
        break;
      case "it":
        locale = (await import("air-datepicker/locale/it")).default.default; // Italian
        break;
      case "oc":
        locale = {
          days: ["Dimenge", "Diluns", "Mars", "Dimècres", "Dijòus", "Divendres", "Dissabte"],
          daysShort: ["Dg", "Dl", "Dm", "Dc", "Dj", "Dv", "Ds"],
          daysMin: ["Dg", "Dl", "Dm", "Dc", "Dj", "Dv", "Ds"],
          months: [
            "Genièr",
            "Febrièr",
            "Març",
            "Abril",
            "Mai",
            "Junh",
            "Julhet",
            "Agost",
            "Setembre",
            "Octòbre",
            "Novembre",
            "Decembre",
          ],
          monthsShort: [
            "Gen.",
            "Feb.",
            "Març",
            "Abr.",
            "Mai",
            "Junh",
            "Jul.",
            "Ago.",
            "Set",
            "Oct",
            "Nov",
            "Dec",
          ],
          today: "Uèi",
          clear: "Esfacar",
          dateFormat: "dd/mm/yyyy",
          timeFormat: "hh:ii",
          firstDay: 1,
        };
        break;
      case "pl":
        locale = (await import("air-datepicker/locale/pl")).default.default; // Polish
        break;
      case "sk":
        locale = (await import("air-datepicker/locale/sk")).default.default; // Slovak
        break;
      case "sl":
        locale = (await import("air-datepicker/locale/sl")).default.default; // Slovenian
        break;
      default:
        locale = (await import("air-datepicker/locale/en")).default.default; // Default to English if no match
        break;
    }

    this.dp.update({
      locale: locale,
    });
  }
}

customElements.define("linea-plot", LineaPlot);
