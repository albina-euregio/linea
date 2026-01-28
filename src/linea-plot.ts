import { i18n } from "./i18n";
import { fetchSMET } from "./data/smet-data";
import type { Result, Values } from "./data/station-data";
import { LineaChart } from "./linea-plot/LineaChart";
import { AbstractLineaChart } from "./linea-plot/AbstractLineaChart";
import { LineaYearChart } from "./linea-plot/LineaYearChart";

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
 *   wintersrc='["data/station1_winter.smet"]'
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
  private styleTag!: HTMLStyleElement;

  private attributeQueue: Promise<void> = Promise.resolve();

  //AirDatePicker, never name it datepicker, it causes a lot of trouble!!!!!
  private dp;

  srcs: string[] = [];
  lazysrcs: string[] = [];
  wintersrcs: string[] = [];
  lineacharts: AbstractLineaChart[] = [] as AbstractLineaChart[];
  results: Result[] = [] as Result[];
  winterresults: Result[] = [] as Result[];
  winterview: boolean = false;

  private backgroundColors = ["rgba(0, 0, 0, 0.05)"];
  private minTime: number = +Infinity;
  private maxTime: number = -Infinity;
  private minTimeWinter: number = +Infinity;
  private maxTimeWinter: number = -Infinity;

  async connectedCallback() {
    this.styleTag = document.createElement("style");

    this.styleTag.textContent = `
        linea-plot {
          display: flex;
          flex-direction: column;
          gap: 20px;

          .toggle-btn {
            padding: 8px 10px;
            background-color: #ffffff;
            color: #555555;
            border: 2px solid #19aaff;
            border-radius: 40px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 300;
            transition: background-color 0.3s ease, color 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;

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

            .linea-tooltiptext {
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

              &::after {
                content: "";
                position: absolute;
                bottom: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: transparent transparent #555 transparent;
              }
            }

            &:hover .linea-tooltiptext {
              visibility: visible;
              opacity: 1;
            }
          }

          .controls {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            row-gap: 6px;
            column-gap: 6px;

            .controls-dates {
              display: flex;
              flex-wrap: nowrap;
              align-items: stretch;

              input,
              button {
                box-sizing: border-box;
                height: 2.25rem;
                line-height: 2.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
              }

              input {
                flex: 1 1 auto;
                border-radius: 0;
                border-left-width: 1px;
                border-right-width: 1px;
              }

              button {
                flex: 0 0 auto;
              }

              > button:first-child {
                border-top-right-radius: 0px;
                border-bottom-right-radius: 0px;
                border-right-width: 1px;
              }

              > button:last-child {
                border-top-left-radius: 0px;
                border-bottom-left-radius: 0px;
                border-left-width: 1px;
              }
            }

            .controls-menu {
              display: flex;

              > button {
                height: 2.25rem;
                line-height: 2.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 0.5rem;
              }
            }
          }
          
          > div:empty {
            display: none;
          }
          
          > div {
            background-color: white;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          &:focus {
            outline: none;
          }
        }
        
        .winterview-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5em 1em;
          cursor: pointer;
          overflow: hidden;
        }

        .winterview-btn .winterview-btn-loader {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.6);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 10;
        }

        .winterview-btn.loading .winterview-btn-loader {
          opacity: 1;
        }

        .winterview-btn.loading .winterview-btn-label {
          visibility: hidden;
        }

        .winterview-btn-spinner {
          width: 1em;
          height: 1em;
          border: 2px solid #000;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          transform-origin: center;
          will-change: transform;
          display: block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
    this.appendChild(this.styleTag);
    await this.#addControls();
    this.#addExportModal();
    if (this.hasAttribute("wintersrc") && this.hasAttribute("showonlywinter")) {
      this.#switchToWinterView();
    } else {
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
    this.filterAndUpdateData();
    if (!this.hasAttribute("showdatepicker")) {
      this.#handleFixedDateView();
    }
  }

  /**
   * fetches the data per default from the src attribute, generalizes it and update the valid date inputs.
   * If a other attribute is given it uses this one instead of src.
   * If the `src`attribute is `wintersrc`, the fetched data is stored in winterresults, minTimeWinter, maxTimeWinter.
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
    } else if (attribute == "wintersrc") {
      this.wintersrcs = srcs;
    }
    if (attribute == "wintersrc") {
      this.winterresults = [];
      for (const src in srcs) {
        let result = await fetchSMET(srcs[src]);
        this.minTimeWinter = Math.min(this.minTimeWinter, result.timestamps[0]);
        this.maxTimeWinter = Math.max(
          this.maxTimeWinter,
          result.timestamps[result.timestamps.length - 1],
        );
        this.winterresults.push(result);
      }
    } else {
      this.results = [];
      for (const src in srcs) {
        let result = await fetchSMET(srcs[src]);
        this.minTime = Math.min(this.minTime, result.timestamps[0]);
        this.maxTime = Math.max(this.maxTime, result.timestamps[result.timestamps.length - 1]);
        this.results.push(result);
      }
      this.#generalizeData();
      this.#updateValidDateInputs();
    }
  }

  /**
   *
   */
  storeDataFromAttribute() {
    if (this.hasAttribute("showonlywinter")) {
      const results: Result[] = JSON.parse(this.getAttribute("data") ?? "");
      this.winterresults = results;
      this.minTimeWinter = +Infinity;
      this.maxTimeWinter = -Infinity;
      for (const result of results) {
        if (this.minTimeWinter > result.timestamps[0]) {
          this.minTimeWinter = result.timestamps[0];
        }
        if (this.maxTimeWinter < result.timestamps[result.timestamps.length - 1]) {
          this.maxTimeWinter = result.timestamps[result.timestamps.length - 1];
        }
      }
    } else {
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
      (this.lineacharts[i] as LineaChart).setData(filteredTimestamps, filteredValues as Values);
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
        if (!this.winterview) {
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
        } else {
          let newEnd = end.subtract({ years: 1 });
          let newStart = start.subtract({ years: 1 });
          if (newStart.toInstant().epochMilliseconds < this.minTimeWinter) {
            previous.disabled = true;
            return;
          }
          this.#updateDatepickerStartEndDate(newStart, newEnd);
          this.#updateWinterPlots();
        }
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
        if (!this.winterview) {
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
        } else {
          let newEnd = end.add({ years: 1 });
          let newStart = start.add({ years: 1 });
          if (newStart.toInstant().epochMilliseconds > this.maxTimeWinter) {
            next.disabled = true;
            return;
          }
          this.#updateDatepickerStartEndDate(newStart, newEnd);
          this.#updateWinterPlots();
        }
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
    if (this.hasAttribute("wintersrc") && !this.hasAttribute("showonlywinter")) {
      const winterviewbtn = document.createElement("button");
      winterviewbtn.id = "winterviewbtn";
      winterviewbtn.classList.add("toggle-btn");
      winterviewbtn.classList.add("winterview-btn");
      winterviewbtn.setAttribute("aria-busy", "false");
      winterviewbtn.setAttribute("type", "button");

      const label = document.createElement("span");
      label.className = "winterview-btn-label";
      label.textContent = i18n.message(
        "dialog:weather-station-diagram:controls:value:winterview:winter",
      );

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

        if (!this.winterview) {
          this.#switchToWinterView().then(() => {
            winterviewbtn.classList.remove("loading");
            winterviewbtn.disabled = false;

            label.textContent = i18n.message(
              "dialog:weather-station-diagram:controls:value:winterview:station",
            );
          });
        } else {
          this.#switchToStationView();
          winterviewbtn.classList.remove("loading");
          winterviewbtn.disabled = false;
          label.textContent = i18n.message(
            "dialog:weather-station-diagram:controls:value:winterview:winter",
          );
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

    await this.#constructDatePicker();
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

  oldDateFormat: string;
  oldStartDate: Temporal.ZonedDateTime;
  oldEndDate: Temporal.ZonedDateTime;

  async #switchToWinterView() {
    if (this.winterresults.length == 0) {
      await this.fetchAndStoreData("wintersrc");
    }
    this.#renderWinter();
  }

  #renderWinter() {
    if (!this.hasAttribute("showonlywinter")) {
      this.oldDateFormat = this.dp.locale.dateFormat;
      this.oldStartDate = this.#getDatePickerStartDate();
      this.oldEndDate = this.#getDatePickerEndDate();
    }
    const [startDate, endDate] = this.#getWinterDates();
    for (const i in this.winterresults) {
      const lcy = new LineaYearChart(
        this.winterresults[i],
        true,
        this.results.length > 1 ? (this.backgroundColors[i] ?? "#00000000") : "#00000000",
        startDate.toPlainDate(),
        endDate.toPlainDate(),
      );
      for (const lc of this.lineacharts) {
        this.removeChild(lc);
      }
      this.lineacharts = [];
      this.lineacharts.push(lcy);
      this.appendChild(lcy);
    }

    this.dp.update({
      dateFormat: "yyyy",
    });
    this.#updateDatepickerStartEndDate(startDate, endDate);
    this.winterview = true;
  }

  #switchToStationView() {
    for (const lc of this.lineacharts) {
      this.removeChild(lc);
    }
    this.lineacharts = [];
    this.#initAfterDataStorage();

    this.dp.update({
      dateFormat: this.oldDateFormat,
    });
    this.dp.disabled = false;
    this.#updateDatepickerStartEndDate(this.oldStartDate, this.oldEndDate);
    this.winterview = false;
  }

  /**
   * Determines the winter season date range based on the current date.
   *
   * If the current date is after October 31st, returns the winter season from November 1st
   * of the current year to April 30th of the next year. Otherwise, returns the winter season
   * from November 1st of the previous year to April 30th of the current year.
   *
   * Also stores the current datepicker format and start/end dates for restoration when
   * switching back from winter view.
   *
   * @returns {[Temporal.ZonedDateTime, Temporal.ZonedDateTime]} A tuple containing the start
   * date (November 1st) and end date (April 30th) of the winter season in the configured timezone
   *
   * @example
   * // If today is November 15, 2024
   * const [start, end] = this.#getWinterDates();
   * // Returns: [2024-11-01T00:00:00+00:00, 2025-04-30T00:00:00+00:00]
   */
  #getWinterDates(): [Temporal.ZonedDateTime, Temporal.ZonedDateTime] {
    // get today and decide:
    // if after october 31th, select next season (11-01 to 04-30 of next year)
    // else select this season
    const today = Temporal.Now.plainDateISO();
    const currentYear = today.year;
    const octoberThirtyfirst = Temporal.PlainDate.from(`${currentYear}-10-31`);

    let winterStartYear = currentYear;
    let winterEndYear = currentYear + 1;

    if (Temporal.PlainDate.compare(today, octoberThirtyfirst) > 0) {
      winterStartYear = currentYear;
      winterEndYear = currentYear + 1;
    } else {
      winterStartYear = currentYear - 1;
      winterEndYear = currentYear;
    }
    return [
      Temporal.PlainDate.from(`${winterStartYear}-11-01`).toZonedDateTime(i18n.timezone()),
      Temporal.PlainDate.from(`${winterEndYear}-04-30`).toZonedDateTime(i18n.timezone()),
    ];
  }

  #updateWinterPlots() {
    for (const lc of this.lineacharts) {
      (lc as LineaYearChart).updateStartEndDate(
        this.#getDatePickerStartDate(),
        this.#getDatePickerEndDate(),
      );
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
  #setStartEndDateToMinMax(winter: boolean = false) {
    if (!this.daterange || !this.dp) {
      return;
    }
    let min, max;
    if (winter) {
      min = this.minTimeWinter;
      max = this.maxTimeWinter;
    } else {
      min = this.minTime;
      max = this.maxTime;
    }
    const minDate = Temporal.Instant.fromEpochMilliseconds(min).toZonedDateTimeISO(i18n.timezone());
    const maxDate = Temporal.Instant.fromEpochMilliseconds(max).toZonedDateTimeISO(i18n.timezone());
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
    if (!this.dp) {
      if (this.winterview) {
        return Temporal.Instant.fromEpochMilliseconds(this.minTime).toZonedDateTimeISO(
          i18n.timezone(),
        );
      } else {
        return Temporal.Instant.fromEpochMilliseconds(this.minTimeWinter).toZonedDateTimeISO(
          i18n.timezone(),
        );
      }
    }
    const date: Date = this.dp.selectedDates[0];
    date.setHours(0);
    date.setMinutes(0);
    return this.#dateToZonedDateTime(date);
  }

  #getDatePickerEndDate(): Temporal.ZonedDateTime {
    if (!this.dp) {
      if (this.winterview) {
        return Temporal.Instant.fromEpochMilliseconds(this.maxTime).toZonedDateTimeISO(
          i18n.timezone(),
        );
      } else {
        return Temporal.Instant.fromEpochMilliseconds(this.maxTimeWinter).toZonedDateTimeISO(
          i18n.timezone(),
        );
      }
    }
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
    const css = await import("air-datepicker/air-datepicker.css?raw");
    this.styleTag.textContent += css.default;

    this.dp = new AirDatepicker(this.daterange, {
      range: true,
      multipleDatesSeparator: " - ",
      onSelect: () => {
        if (!this.winterview) {
          this.filterAndUpdateData();
        }
      },
      onShow: () => {
        if (this.winterview) {
          requestAnimationFrame(() => this.dp.hide());
        }
      },
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
