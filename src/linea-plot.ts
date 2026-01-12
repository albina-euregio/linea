import { i18n } from "./i18n";
import { fetchSMET } from "./smet-data";
import type { Result, Values } from "./station-data";
import { LineaChart } from "./linea-plot/LineaChart";

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
 * - `showinteractiveblogexport` - toggles if the export for the interactive blog button is shown, just in combination with `showexport`
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
  private daterange!: HTMLInputElement;

  private attributeQueue: Promise<void> = Promise.resolve();

  //AirDatePicker, never name it datepicker, it causes a lot of trouble!!!!!
  private dp;

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

        .controls {
            text-align: center;
        }

        .toggle-btn {
            padding: 10px 20px;
            background-color: #ffffff;
            color: #555555;
            border: 2px solid #19aaff;
            border-radius: 40px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 300;
            transition:
                background-color 0.3s ease,
                color 0.3s ease;

            &:hover {
                background-color: #19aaff;
                color: white;
            }

            &:active {
                transform: translateY(1px);
            }
        }

        .linea-tooltip {
          position: relative;
          display: inline-block;
        }

        .linea-tooltip .linea-tooltiptext {
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

        .linea-tooltip .linea-tooltiptext::after {
          content: "";
          position: absolute;
          bottom: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: transparent transparent #555 transparent;
        }

        .linea-tooltip:hover .linea-tooltiptext {
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

        .dpclass {
          border-top-right-radius: 0px;
          border-bottom-right-radius: 0px;
          border-top-left-radius: 0px;
          border-bottom-left-radius: 0px;
          border-left-width: 1px;
          border-right-width: 1px;
        }
        
        .controls-dates > button:first-child {
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
      `;
    this.appendChild(style);
    this.#addExportModal();
    this.#addControls();
    if (this.hasAttribute("data")) {
      this.storeDataFromAttribute();
      this.#initAfterDataStorage();
    } else {
      this.fetchAndStoreData()
        .then(() => {
          this.#initAfterDataStorage();
          this.#lazyLoad();
        })
        .catch((_) => {});
    }
    this.tabIndex = 0;
    this.focus();
    this.isLoaded = true;
  }

  attributeChangedCallback(name: string) {
    if (this.isLoaded && name === "src") {
      this.attributeQueue = this.attributeQueue.then(async () => {
        for (const lc of this.lineacharts) {
          this.removeChild(lc);
        }
        this.lineacharts = [];
        this.results = [];
        this.minTime = +Infinity;
        this.maxTime = -Infinity;
        this.fetchAndStoreData()
          .then(() => {
            this.#initAfterDataStorage();
            this.#lazyLoad();
            this.isLoaded = true;
          })
          .catch((_) => {});
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
      src.startsWith("[") || src.startsWith("'") ? (JSON.parse(src) as string[]) : [src];

    if (srcs.length == 0) {
      throw "Empty src array!";
    }

    if (attribute == "src") {
      this.srcs = srcs;
    } else if (attribute == "lazysrc") {
      this.lazysrcs = srcs;
    }
    this.results = [];
    for (const src in srcs) {
      let result = await fetchSMET(srcs[src]);
      this.minTime = result.timestamps[0];
      this.maxTime = result.timestamps[result.timestamps.length - 1];
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
      this.#setStartEndDateTo(
        result.timestamps[0],
        result.timestamps[result.timestamps.length - 1],
      );
    }
  }

  /**
   * Filters the Results for each LineaChart for the given timespan.
   * Passes the filtered data to the LineaCharts
   * @param startDate from where the data shall be shown
   * @param endDate to when the data shall be shown
   */
  filterAndUpdateData(
    startDate: Temporal.ZonedDateTime = this.#getDatePickerStartDate(),
    endDate: Temporal.ZonedDateTime = this.#getDatePickerEndDate(),
  ) {
    const startTimestamp = startDate.toInstant().epochMilliseconds;
    const endTimestamp = endDate.toInstant().epochMilliseconds;

    for (let i = 0; i < this.lineacharts.length; i++) {
      const res = this.results[i];
      if (res === undefined) {
        continue;
      }
      let filteredValues = {};

      for (const key in res.values) {
        filteredValues[key] = res.values[key].filter(
          (t, j) => res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp,
        );
      }
      const filteredTimestamps = res.timestamps.filter(
        (t) => t >= startTimestamp && t <= endTimestamp,
      );
      this.lineacharts[i]?.setData(filteredTimestamps, filteredValues as Values);
    }
  }

  /**
   *
   */
  async #addExportModal() {
    if (!this.hasAttribute("showexport")) {
      return;
    }
    const { ExportModal } = await import("./exportmodal");
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

      this.daterange = document.createElement("input");
      this.daterange.type = "text";
      this.daterange.id = "daterangeinput";
      this.daterange.classList.add("toggle-btn");
      this.daterange.classList.add("dpclass");

      const previous = document.createElement("button");
      previous.classList.add("toggle-btn");
      previous.classList.add("controls-dates-inputs");
      previous.classList.add("linea-tooltip");
      previous.innerHTML = `&larr;<span class='linea-tooltiptext'>${i18n.message("dialog:weather-station-diagram:controls:tooltips:previous")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          previous.click();
        }
      });
      previous.addEventListener("click", () => {
        const start = this.#dateToZonedDateTime(this.dp.selectedDates[0]);
        const end = this.#dateToZonedDateTime(this.dp.selectedDates[1]);
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
        this.#updateDatepickerStartEndDate(newStart, newEnd);
        this.filterAndUpdateData(newStart, newEnd);
      });
      const next = document.createElement("button");
      next.classList.add("toggle-btn");
      next.classList.add("controls-dates-inputs");
      next.classList.add("linea-tooltip");
      next.innerHTML = `&rarr;<span class='linea-tooltiptext'>${i18n.message("dialog:weather-station-diagram:controls:tooltips:next")}</span>`;
      this.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          next.click();
        }
      });
      next.addEventListener("click", () => {
        const start = this.#dateToZonedDateTime(this.dp.selectedDates[0]);
        const end = this.#dateToZonedDateTime(this.dp.selectedDates[1]);
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
        this.#updateDatepickerStartEndDate(newStart, newEnd);
        this.filterAndUpdateData(newStart, newEnd);
      });
      controlsdates.appendChild(previous);
      controlsdates.appendChild(this.daterange);
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
        </svg><span class="linea-tooltiptext">${i18n.message("dialog:weather-station-diagram:controls:tooltips:wholetimespan")}</span>`;
      enlargebtn.classList.add("toggle-btn");
      enlargebtn.classList.add("linea-tooltip");
      enlargebtn.addEventListener("click", () => {
        this.#setStartEndDateToMinMax();
        this.filterAndUpdateData();
      });
      // menu.appendChild(enlargebtn);
    }
    controls.appendChild(menu);
    this.appendChild(controls);

    this.#constructDatePicker();
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
    if (!this.daterange) {
      return;
    }
    const minTime = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxTime = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    this.#updateDatePickerMinMax(minTime, maxTime);
  }

  /**
   *  Set the start and end input to the values given by the attributes
   * @returns
   */
  #setStartEndDateToAttributes() {
    if (!this.daterange || !this.dp) {
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
      const minTime = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
      startdate = minTime;
    }
    if (
      Temporal.ZonedDateTime.compare(enddate, minTime) < 0 ||
      Temporal.ZonedDateTime.compare(enddate, maxTime) > 0
    ) {
      const maxTime = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
        i18n.timezone(),
      );
      enddate = maxTime;
    }
    this.#updateDatepickerStartEndDate(startdate, enddate);
    this.filterAndUpdateData(startdate, enddate);
  }

  /**
   *
   * set the Input fields to the widthest available timespan
   */
  #setStartEndDateToMinMax() {
    if (!this.daterange || !this.dp) {
      return;
    }
    const minDate = Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    const maxDate = Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
      i18n.timezone(),
    );
    this.#updateDatepickerStartEndDate(minDate, maxDate);
  }

  /**
   * Set the start and endate in the datepicker to the given values
   * values are given in UTC epoch milliseconds
   *
   */
  #setStartEndDateTo(min: number, max: number) {
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
   *
   * Converts a Date to a ZonedDateTime
   * @param value Date to convert
   * @returns a Temporal ZonedDateTime Object
   */
  #dateToZonedDateTime(value: Date): Temporal.ZonedDateTime {
    // Convert the Date to a Temporal Instant
    const instant = Temporal.Instant.from(value.toISOString());
    // Return a ZonedDateTime object in the specified timezone
    return instant.toZonedDateTimeISO(i18n.timezone());
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

  #getDatePickerStartDate(): Temporal.ZonedDateTime {
    const date: Date = this.dp.selectedDates[0];
    date.setHours(0);
    date.setMinutes(0);
    return this.#dateToZonedDateTime(date);
  }

  #getDatePickerEndDate(): Temporal.ZonedDateTime {
    let date: Date;
    if (this.dp.selectedDates.length == 1) {
      date = this.dp.selectedDates[0];
    } else {
      date = this.dp.selectedDates[1];
    }
    return this.#dateToZonedDateTime(date).add({ days: 1 });
  }

  /**
   * cosntructs the AirDatePicker
   */
  async #constructDatePicker() {
    const { default: AirDatepicker } = await import("air-datepicker");
    import("air-datepicker/air-datepicker.css");
    this.dp = new AirDatepicker(this.daterange, {
      range: true,
      multipleDatesSeparator: " - ",
      onSelect: (_) => {
        this.filterAndUpdateData();
      },
    });
    this.#localizeDatePicker();
  }

  /**
   * Localizes the AirDatepicker
   */
  async #localizeDatePicker() {
    let locale;
    switch (i18n.lang) {
      case "en":
        locale = await import("air-datepicker/locale/en"); // English
        break;
      case "ca":
        locale = await import("air-datepicker/locale/ca"); // Catalan
        break;
      case "de":
        locale = await import("air-datepicker/locale/de"); // German
        break;
      case "es":
        locale = await import("air-datepicker/locale/es"); // Spanish
        break;
      case "fr":
        locale = await import("air-datepicker/locale/fr"); // French
        break;
      case "it":
        locale = await import("air-datepicker/locale/it"); // Italian
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
        locale = await import("air-datepicker/locale/pl"); // Polish
        break;
      case "sk":
        locale = await import("air-datepicker/locale/sk"); // Slovak
        break;
      case "sl":
        locale = await import("air-datepicker/locale/sl"); // Slovenian
        break;
      default:
        locale = await import("air-datepicker/locale/en"); // Default to English if no match
        break;
    }

    this.dp.update({
      locale: locale.default.default,
    });
  }
}

customElements.define("linea-plot", LineaPlot);
