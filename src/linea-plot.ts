import { i18n } from "./i18n";
import { fetchSMET } from "./smet-data";
import type { Result, Values } from "./station-data";
import { LineaChart } from "./linea-plot/LineaChart";
import { ExportModal } from "./exportmodal";

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
 * - `showdatepicker` {boolean} - When present, displays date range picker controls for filtering data
 * - `showtitle` {boolean} - When present, display the station name and altitude as title
 * - `backgroundcolors` {string} - JSON-encoded array with colorcodes for the background color in the plots, same order as the SMET files.
 *    If there are more SMET files than colorcodes for the other stations there is no background color set. Per default the first station is set in light grey, if there is more than one.
 * - `showsurfacehoarseries` {boolean} - When present, display a series which shows the surface hoar potential
 * - `startdate` {string} - Initial start date in ISO 8601 format (e.g., "2025-06-04T10:24[Europe/Berlin]"). 
 *    If used with `showdatepicker` and `enddate` it will set the initial date range.
 *    If used without `showdatepicker`, but with `enddate` it will set a fixed date range.
 * - `enddate` {string} - Initial end date in ISO 8601 format (e.g., "2025-06-04T12:24[Europe/Berlin]").
 *    If used with `showdatepicker` and `startdate` it will set the initial date range.
 *    If used without `showdatepicker`, but with `startdate` it will set a fixed date range.
 * - `showexport` - toggles if the export button is shown
 * 
 * If startdate or enddate is missing it will show all data from the SMET file. 
 * If the startdate is out of bound of the data, it is set to the first available timestamp, simliar enddate is set to the last.
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
 *   showexport
 *   startdate="2025-06-01T00:00[Europe/Berlin]"
 *   enddate="2025-06-30T23:59[Europe/Berlin]">
 * </linea-plot>
 * 
 * <!-- Fixed date view without picker -->
 * <linea-plot 
 *   src='["data/station1.smet"]'
 *   startdate="2025-06-04T10:00[Europe/Berlin]"
 *   enddate="2025-06-04T18:00[Europe/Berlin]">
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
 */
export class LineaPlot extends HTMLElement {
  static observedAttributes = ["src"];
  private isLoaded: boolean = false;

  private exportModal!: ExportModal;
  private startInput!: HTMLInputElement;
  private endInput!: HTMLInputElement;

  srcs: string[] = [];
  lazysrcs: string[] = [];
  lineacharts: LineaChart[] = [] as LineaChart[];
  results: Result[] = [] as Result[];

  private backgroundColors = ["rgba(0, 0, 0, 0.05)"];
  private minTime: number = +Infinity;
  private maxTime: number = -Infinity;

  connectedCallback() {
    const style = document.createElement("style");
    style.textContent = `
        linea-plot:focus {
          outline: none;
        }

        .tooltip {
          position: relative;
          display: inline-block;
        }

        .tooltip .tooltiptext {
          visibility: hidden;
          width: 120px;
          background-color: #555;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 5px 0;
          position: absolute;
          z-index: 1;
          top: 135%;
          left: 50%;
          margin-left: -60px;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .tooltip .tooltiptext::after {
          content: "";
          position: absolute;
          bottom: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent #555 transparent;
        }

        .tooltip:hover .tooltiptext {
          visibility: visible;
          opacity: 1;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          align-items: left;
          row-gap: 6px;
          column-gap: 6px;
        }
        
        .controls-dates {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          row-gap: 4px;
        }

        .controls-break {
          flex-basis: 0;
          height: 0;
        }

        .controls-dates-inputs {
          border-radius: 0;
          border-right-width: 0px;
        }

        .controls-menu {
          border-radius = 0px;
          border-left-width = 1px;
          border-right-width = 1px;
        }

        .controls-menu > button:first-child {
          border-top-right-radius: 0px;
          border-bottom-right-radius: 0px;
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
          border-left-width: 2px;
          border-right-width: 1px;
        }
        
        .controls-menu > button:last-child {
          border-top-right-radius: 20px;
          border-bottom-right-radius: 20px;
          border-top-left-radius: 0px;
          border-bottom-left-radius: 0px;
          border-left-width: 1px;
          border-right-width: 2px;
        }

        @media (min-width: 641px) {
          .controls-dates > *:first-child {
            border-top-left-radius: 20px;
            border-bottom-left-radius: 20px;
          }

          .controls-dates > *:last-child {
            border-top-right-radius: 20px;
            border-bottom-right-radius: 20px;
            border-right-width: 2px;
          }
        }
        
        @media (max-width: 640px) {
        
          .controls-break {
            flex-basis: 100%; /* force wrap */
          }
          
          .controls-dates > button:first-child {
            border-top-left-radius: 20px;
            border-bottom-left-radius: 20px;
            border-right-width: 1px;
          }

          .startDateInput {
            border-top-right-radius: 20px;
            border-bottom-right-radius: 20px;
            border-left-width: 1px;
            border-right-width: 2px;
          }

          .endDateInput {
            border-top-left-radius: 20px;
            border-bottom-left-radius: 20px;
            border-right-width: 1px;
          }

          .controls-dates > button:last-child {
            border-top-right-radius: 20px;
            border-bottom-right-radius: 20px;
            border-left-width: 1px;
            border-right-width: 2px;
          }
        }
      `;
    this.appendChild(style);
    this.#addExportModal();
    this.#addControls();
    if (this.hasAttribute("data")) {
      this.storeDataFromAttribute();
      this.#initAfterDataStorage();
    } else {
      this.fetchAndStoreData().then(() => {
        this.#initAfterDataStorage();
        this.#lazyLoad();
      });
    }
    this.tabIndex = 0;
    this.focus();
    this.isLoaded = true;
  }

  attributeChangedCallback(name: string) {
    if (this.isLoaded && name === "src") {
      for (const lc of this.lineacharts) {
        this.removeChild(lc);
      }
      this.lineacharts = [];
      this.results = [];
      this.minTime = +Infinity;
      this.maxTime = -Infinity;
      this.fetchAndStoreData().then(() => {
        this.render();
        this.#lazyLoad();
      });
    }
  }

  /**
   * builds and update the UI after data is stored.
   */
  #initAfterDataStorage() {
    this.#updateValidDateInputs();
    this.render();
    if (
      this.hasAttribute("showdatepicker") &&
      this.hasAttribute("startdate") &&
      this.hasAttribute("enddate")
    ) {
      this.#setStartEndDateToAttributes();
    } else {
      this.#setStartEndDateToMinMax();
    }
    if (!this.hasAttribute("showdatepicker")) {
      this.#handleFixedDateView();
    }
  }

  /**
   * fetches the data per default from the src attribute, generalizes it and update the valid date inputs.
   * If a other attribute is given it uses this one instead of src
   * @param attribute {string} - attribute to fetch the data from, default is "src"
   */
  async fetchAndStoreData(attribute: string = "src") {
    if (!globalThis.Temporal) {
      await import("temporal-polyfill/global");
    }
    const src = this.getAttribute(attribute) ?? "";
    let srcs: string[] =
      src.startsWith("[") || src.startsWith('"') ? (JSON.parse(src) as string[]) : [src];
    if (!(srcs instanceof Array)) {
      srcs = [srcs];
      this.backgroundColors = [];
    }
    if (attribute == "src") {
      this.srcs = srcs;
    } else if ((attribute = "lazysrc")) {
      this.lazysrcs = srcs;
    }
    this.results = [];
    this.minTime = +Infinity;
    this.maxTime = -Infinity;
    for (const src in srcs) {
      let result = await fetchSMET(srcs[src]);
      if (this.minTime > result.timestamps[0]) {
        this.minTime = result.timestamps[0];
      }
      if (this.maxTime < result.timestamps[result.timestamps.length - 1]) {
        this.maxTime = result.timestamps[result.timestamps.length - 1];
      }
      this.results.push(result);
    }
    this.#generalizeData();
    this.#updateValidDateInputs();
  }

  /**
   *
   */
  storeDataFromAttribute() {
    const results: Result[] = JSON.parse(this.getAttribute("data") ?? "");
    this.results = results;
    this.minTime = +Infinity;
    this.maxTime = -Infinity;
    for (const result of results) {
      if (this.minTime > result.timestamps[0]) {
        this.minTime = result.timestamps[0];
      }
      if (this.maxTime < result.timestamps[result.timestamps.length - 1]) {
        this.maxTime = result.timestamps[result.timestamps.length - 1];
      }
    }
    this.#generalizeData();
    this.#updateValidDateInputs();
  }

  /**
   * creates all LineaCharts and initializate them
   */
  render() {
    if (this.hasAttribute("backgroundcolors")) {
      this.backgroundColors = JSON.parse(this.getAttribute("backgroundcolors") ?? "");
    }
    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(
        result,
        this.hasAttribute("showtitle"),
        this.hasAttribute("showsurfacehoarseries"),
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
      );
      this.lineacharts.push(lc);
      this.appendChild(lc);
    }
  }

  /**
   * Filters the Results for each LineaChart for the given timespan.
   * Passes the filtered data to the LineaCharts
   * @param startDate from where the data shall be shown
   * @param endDate to when the data shall be shown
   */
  filterAndUpdateData(
    startDate: Temporal.ZonedDateTime = this.#inputValueToZonedDateTime(this.startInput.value),
    endDate: Temporal.ZonedDateTime = this.#inputValueToZonedDateTime(this.endInput.value),
  ) {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;
    for (let i = 0; i < this.lineacharts.length; i++) {
      const res = this.results[i];

      let filteredValues = {};

      for (const key in res.values) {
        filteredValues[key] = res.values[key].filter(
          (t, j) => res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp,
        );
      }
      const filteredTimestamps = res.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      this.lineacharts[i].setData(filteredTimestamps, filteredValues as Values);
    }
  }

  /**
   *
   */
  #addExportModal() {
    this.exportModal = new ExportModal(document.createElement("div"), this);
    this.appendChild(this.exportModal.modal);
  }

  /**
   * Adds the controls to the Plot:
   * - Datepicker with (previous|startDate|endDate|next)
   * - Menu buttons with (export|enlarge)
   *
   * enlarge shows all available data and is shown when the datepicker is there too
   * export exports the drawed canvas on the screen, see @class ExportModal
   */
  #addControls() {
    if (!this.hasAttribute("showdatepicker") && !this.hasAttribute("showexport")) {
      return;
    }
    const controls = document.createElement("div");
    controls.classList.add("controls");

    if (this.hasAttribute("showdatepicker")) {
      const controlsdates = document.createElement("div");
      controlsdates.classList.add("controls-dates");
      controls.appendChild(controlsdates);

      this.startInput = document.createElement("input");
      this.startInput.type = "datetime-local";
      this.startInput.classList.add("toggle-btn");
      this.startInput.classList.add("controls-dates-inputs");
      this.startInput.classList.add("startDateInput");
      this.startInput.addEventListener("change", () => {
        this.filterAndUpdateData(
          this.#inputValueToZonedDateTime(this.startInput.value),
          this.#inputValueToZonedDateTime(this.endInput.value),
        );
      });
      this.endInput = document.createElement("input");
      this.endInput.classList.add("toggle-btn");
      this.endInput.classList.add("controls-dates-inputs");
      this.endInput.classList.add("endDateInput");
      this.endInput.type = "datetime-local";
      this.endInput.addEventListener("change", () => {
        this.filterAndUpdateData(
          this.#inputValueToZonedDateTime(this.startInput.value),
          this.#inputValueToZonedDateTime(this.endInput.value),
        );
      });

      const previous = document.createElement("button");
      previous.classList.add("toggle-btn");
      previous.classList.add("controls-dates-inputs");
      previous.classList.add("tooltip");
      previous.innerHTML = `&larr;<span class='tooltiptext'>${i18n.message("dialog:weather-station-diagram:controls:tooltips:previous")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          previous.click();
        }
      });
      previous.addEventListener("click", () => {
        const start = this.#inputValueToZonedDateTime(this.startInput.value);
        const end = this.#inputValueToZonedDateTime(this.endInput.value);
        if (!start || !end) return;
        next.disabled = false;
        let newEnd = end.subtract({ days: 1 });
        let newStart = start.subtract({ days: 1 });
        if (newStart.toInstant().epochMilliseconds < this.minTime) {
          newStart = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
            i18n.timezone(),
          );
          previous.disabled = true;
          newEnd = end;
        } else if (newStart.toInstant().epochMilliseconds > this.maxTime) {
          this.#setStartEndDateToMinMax();
          this.filterAndUpdateData();
          return;
        }
        this.startInput.value = this.#zonedDateTimeToLocalInputValue(newStart);
        this.endInput.value = this.#zonedDateTimeToLocalInputValue(newEnd);
        this.filterAndUpdateData(newStart, newEnd);
      });
      const next = document.createElement("button");
      next.classList.add("toggle-btn");
      next.classList.add("controls-dates-inputs");
      next.classList.add("tooltip");
      next.innerHTML = `&rarr;<span class='tooltiptext'>${i18n.message("dialog:weather-station-diagram:controls:tooltips:next")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          next.click();
        }
      });
      next.addEventListener("click", () => {
        const start = this.#inputValueToZonedDateTime(this.startInput.value);
        const end = this.#inputValueToZonedDateTime(this.endInput.value);
        if (!start || !end) return;
        previous.disabled = false;
        let newStart = start.add({ days: 1 });
        let newEnd = end.add({ days: 1 });
        if (newEnd.toInstant().epochMilliseconds > this.maxTime) {
          newEnd = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
            i18n.timezone(),
          );
          next.disabled = true;
          newStart = start;
        } else if (newEnd.toInstant().epochMilliseconds < this.minTime) {
          this.#setStartEndDateToMinMax();
          this.filterAndUpdateData();
          return;
        }
        this.startInput.value = this.#zonedDateTimeToLocalInputValue(newStart);
        this.endInput.value = this.#zonedDateTimeToLocalInputValue(newEnd);
        this.filterAndUpdateData(newStart, newEnd);
      });
      const breakElement = document.createElement("span");
      breakElement.classList.add("controls-break");
      controlsdates.appendChild(previous);
      controlsdates.appendChild(this.startInput);
      controlsdates.appendChild(breakElement);
      controlsdates.appendChild(this.endInput);
      controlsdates.appendChild(next);
    }
    const menu = document.createElement("div");
    menu.classList.add("controls-menu");
    if (this.hasAttribute("showexport")) {
      const exportbtn = document.createElement("button");
      exportbtn.innerHTML = `${i18n.message("dialog:weather-station-diagram:controls:value:export")}`;
      exportbtn.classList.add("toggle-btn");
      exportbtn.addEventListener("click", () => {
        if (this.lineacharts.length == 0) {
          alert("Nothing to export!");
          return;
        }
        this.exportModal.show();
      });
      menu.appendChild(exportbtn);
    }
    if (this.hasAttribute("showdatepicker")) {
      const enlargebtn = document.createElement("button");
      enlargebtn.innerHTML = `<svg width="13px" height="13px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polyline data-name="Right" fill="none" id="Right-2" points="3 17.3 3 21 6.7 21" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        <line fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="10" x2="3.8" y1="14" y2="20.2"/>
        <line fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="14" x2="20.2" y1="10" y2="3.8"/>
        <polyline data-name="Right" fill="none" id="Right-3" points="21 6.7 21 3 17.3 3" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg><span class="tooltiptext">${i18n.message("dialog:weather-station-diagram:controls:tooltips:wholetimespan")}</span>`;
      enlargebtn.classList.add("toggle-btn");
      enlargebtn.classList.add("tooltip");
      enlargebtn.addEventListener("click", () => {
        this.#setStartEndDateToMinMax();
        this.filterAndUpdateData();
      });
      menu.appendChild(enlargebtn);
    }
    controls.appendChild(menu);
    this.appendChild(controls);
    this.focus();
  }

  /**
   * handles the fixed date view
   */
  #handleFixedDateView() {
    if (
      !this.hasAttribute("showdatepicker") &&
      (!this.hasAttribute("startdate") || !this.hasAttribute("enddate"))
    ) {
      console.debug("Start and Endate are not chosen, all data is presented!");
    } else if (!this.hasAttribute("showdatepicker")) {
      this.filterAndUpdateData(
        Temporal.ZonedDateTime.from(this.getAttribute("startdate") ?? "1900-00-00T00:00[UTC]"),
        Temporal.ZonedDateTime.from(this.getAttribute("enddate") ?? "2300-00-00T00:00[UTC]"),
      );
    }
  }

  /**
   * Loads lazy data if the lazysrc attribute is given
   */
  #lazyLoad() {
    if (this.hasAttribute("lazysrc")) {
      this.fetchAndStoreData("lazysrc");
    }
  }

  /**
   * Generalizes the data stored in the results list:
   * ensures that all Results objects have the same timestamps and fill up missing data.
   * if the first chart has data from e.g. 03:00 to 05:00 and the second from 04:00 to 06:00 after this function
   * both will have data from 03:00 to 06:00 with null values in 03:00 to 04:00 for the second and from 05:00 to 06:00 for the first
   * so we can show all available data
   */
  #generalizeData() {
    if (this.results.length === 0) {
      return;
    }
    const tsSet = new Set<number>();
    for (const res of this.results) {
      for (const t of res.timestamps) tsSet.add(t);
    }
    const allTimestamps = Array.from(tsSet).sort((a, b) => a - b);

    // align each result to the common timeline, filling missing entries with null to not show missing data
    for (const res of this.results) {
      for (const key in res.values) {
        const map = new Map<number, number[]>();
        for (let i = 0; i < res.timestamps.length; i++) {
          map.set(res.timestamps[i], res.values[key][i]);
        }
        const newValues = allTimestamps.map((t) => (map.has(t) ? (map.get(t) ?? null) : null));
        res.values[key] = newValues;
      }
      // set the common timeline to all results
      res.timestamps = allTimestamps.slice();
    }
  }

  /**
   * sets the valid data range to the startDate and endDate inputs
   * @returns
   */
  #updateValidDateInputs() {
    if (!this.startInput || !this.endInput) {
      return;
    }
    const minTime = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxTime = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    this.startInput.min = this.#zonedDateTimeToLocalInputValue(minTime);
    this.startInput.max = this.#zonedDateTimeToLocalInputValue(maxTime);
    this.endInput.min = this.#zonedDateTimeToLocalInputValue(minTime);
    this.endInput.max = this.#zonedDateTimeToLocalInputValue(maxTime);
  }

  /**
   *  Set the start and end input to the values given by the attributes
   * @returns
   */
  #setStartEndDateToAttributes() {
    if (!this.startInput || !this.endInput) {
      return;
    }
    let startdate = Temporal.ZonedDateTime.from(this.getAttribute("startdate") ?? "");
    let enddate = Temporal.ZonedDateTime.from(this.getAttribute("enddate") ?? "");
    const minTime = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxTime = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );

    if (
      Temporal.ZonedDateTime.compare(startdate, maxTime) > 0 ||
      Temporal.ZonedDateTime.compare(startdate, minTime) < 0
    ) {
      startdate = this.#inputValueToZonedDateTime(this.startInput.min);
    }
    if (
      Temporal.ZonedDateTime.compare(enddate, minTime) < 0 ||
      Temporal.ZonedDateTime.compare(enddate, maxTime) > 0
    ) {
      enddate = this.#inputValueToZonedDateTime(this.endInput.max);
    }
    this.startInput.value = this.#zonedDateTimeToLocalInputValue(startdate);
    this.endInput.value = this.#zonedDateTimeToLocalInputValue(enddate);
    this.filterAndUpdateData(startdate, enddate);
  }

  /**
   *
   * set the Input fields to the widthest available timespan
   */
  #setStartEndDateToMinMax() {
    if (!this.startInput || !this.endInput) {
      return;
    }
    this.startInput.value = this.#zonedDateTimeToLocalInputValue(
      Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(i18n.timezone()),
    );
    this.endInput.value = this.#zonedDateTimeToLocalInputValue(
      Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(i18n.timezone()),
    );
  }

  /**
   * Converts dates into the format of HTML datetime-local inputs
   * @param zdt date to convert
   * @returns string, formated for HTML datetime-local input value
   */
  #zonedDateTimeToLocalInputValue(zdt: Temporal.ZonedDateTime): string {
    // Convert to a PlainDateTime in the same time zone
    const pdt = zdt.toPlainDateTime();
    return pdt.toString({ smallestUnit: "minutes" });
  }

  /**
   *
   * Convert HTMl datetime-local input values into ZonedDateTime Objects
   *
   * @param value a HTML datetime-local string to convert
   * @returns a Temporal ZonedDateTime Object
   */
  #inputValueToZonedDateTime(value: string) {
    // value = "2025-06-04T10:24"
    const pdt = Temporal.PlainDateTime.from(value);
    return pdt.toZonedDateTime(i18n.timezone());
  }
}

customElements.define("linea-plot", LineaPlot);
