
import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import { fetchSMET, Result, Values } from "./smet-data";
import { LineaChart } from "./linea-plot/LineaChart";
import { Temporal } from "temporal-polyfill";

/**
 * LineaPlot Web Component
 * 
 * A custom HTML element for displaying and filtering SMET (Standard Meteorological Exchange Format) data
 * with interactive date range selection and multi-station chart visualization. Plotting it accordingly to the EAWS workgroup.
 * 
 * @element linea-plot
 * 
 * @attributes
 * - `src` {string} - JSON-encoded array (or single url) of SMET file URLs to fetch data from (required)
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
 * 
 * If startdate or enddate is missing it will show all data from the SMET file.
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
 * - Timezone-aware date handling (default: Europe/Berlin)
 * - uPlot-based chart rendering with customizable styling
 * - Null value handling for missing data points
 */
export class LineaPlot extends HTMLElement {


  private startInput!: HTMLInputElement;
  private endInput!: HTMLInputElement;

  private lineacharts: LineaChart[] = [] as LineaChart[];
  private results: Result[] = [] as Result[];

  private timeZone:string = "UTC";
  private backgroundColors = ["rgba(0, 0, 0, 0.05)"];
  private minTime: number = +Infinity;
  private maxTime: number = -Infinity;

  connectedCallback() {
      const style = document.createElement("style");
      style.textContent = `
        linea-plot:focus {
          outline: none;
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
    if(this.hasAttribute("showdatepicker")){
      this.#addControls();
    }

    this.fetchAndStoreData().then(() => {
      this.#updateValidDateInputs();
      this.render();
      if(this.hasAttribute("showdatepicker") && this.hasAttribute("startdate") && this.hasAttribute("enddate")){
        this.#setStartEndDateToAttributes();
      } else {
        this.#setStartEndDateToMinMax();
      }
      if(!this.hasAttribute("showdatepicker")){
        this.#handleFixedDateView();
      }
    });
    this.tabIndex = 0;
    this.focus();
  }

  /**
   * fetches the data, generalizes it and update the valid date inputs
   */
  async fetchAndStoreData(){
    let srcs: string[] = JSON.parse(this.getAttribute("src") ?? "") as string[];
    if (!(srcs instanceof Array)){
      srcs = [srcs];
      this.backgroundColors = [];
    }
    for (const src in srcs) {
      let result = await fetchSMET(srcs[src]);
      if (this.minTime > result.timestamps[0]){
        this.minTime = result.timestamps[0];
      }
      if (this.maxTime < result.timestamps[result.timestamps.length-1]){
        this.maxTime = result.timestamps[result.timestamps.length-1];
      }
      this.results.push(result);
    }
    this.#generalizeData();
    this.#updateValidDateInputs();
  }

  /**
   * creates all LineaCharts and initializate them
   */
  render(){
    if(this.hasAttribute("backgroundcolors")){
      this.backgroundColors = JSON.parse(this.getAttribute("backgroundcolors")?? "");
    }

    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(result.timestamps, result.values, result.station, result.altitude,
         this.hasAttribute("showtitle"), this.hasAttribute("showsurfacehoarseries"), this.backgroundColors[i] ?? "#00000000");
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
  filterAndUpdateData(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime){
    for (let i = 0; i < this.lineacharts.length; i++){
      const startTimestamp = startDate.toInstant().epochMilliseconds / 1000;
      const endTimestamp = endDate.toInstant().epochMilliseconds / 1000;
      const res = this.results[i];

      let filteredValues = {};

      for (const key in res.values) {
        filteredValues[key] = res.values[key].filter((t, j) => res.timestamps[j] >= startTimestamp && res.timestamps[j] <= endTimestamp);
      }
      const filteredTimestamps = res.timestamps.filter((t, j) => 
        t >= startTimestamp && t <= endTimestamp
      );
      this.lineacharts[i].setData(filteredTimestamps, filteredValues as Values);
    }
  }

  #addControls(){
    const controls = document.createElement("div");
    controls.classList.add("controls");
    controls.classList.add("controls-dates");

    this.startInput = document.createElement("input");
    this.startInput.type = "datetime-local";
    this.startInput.classList.add("toggle-btn");
    this.startInput.classList.add("controls-dates-inputs");
    this.startInput.classList.add("startDateInput");
    this.startInput.addEventListener('change', () => {
      this.filterAndUpdateData(this.#inputValueToZonedDateTime(this.startInput.value), this.#inputValueToZonedDateTime(this.endInput.value));
    });
    this.endInput = document.createElement("input");
    this.endInput.classList.add("toggle-btn");
    this.endInput.classList.add("controls-dates-inputs");
    this.endInput.classList.add("endDateInput");
    this.endInput.type = "datetime-local";
    this.endInput.addEventListener('change', () => {
      this.filterAndUpdateData(this.#inputValueToZonedDateTime(this.startInput.value), this.#inputValueToZonedDateTime(this.endInput.value));
    });
      
    const previousWeek = document.createElement("button");
    previousWeek.classList.add("toggle-btn");
    previousWeek.classList.add("controls-dates-inputs");
    previousWeek.innerHTML = "&larr;";
    this.addEventListener("keydown", (e) => {
      if(e.key === "ArrowLeft"){
        previousWeek.click();
      }
    });
    previousWeek.addEventListener("click", () => {
      const start = this.#inputValueToZonedDateTime(this.startInput.value);
      if (!start) return;
      nextWeek.disabled = false;
      let newStart = start.subtract({ days: 7 });
      if((newStart.toInstant().epochMilliseconds / 1000) < this.minTime){
        newStart = Temporal.Instant.fromEpochMilliseconds(this.minTime * 1000).toZonedDateTimeISO(this.timeZone);
        previousWeek.disabled = true;
      }
      const newEnd = start;
      this.startInput.value = this.#zonedDateTimeToLocalInputValue(newStart);
      this.endInput.value = this.#zonedDateTimeToLocalInputValue(newEnd);
      this.filterAndUpdateData(newStart, newEnd);
    });
    const nextWeek = document.createElement("button");
    nextWeek.classList.add("toggle-btn");
    nextWeek.classList.add("controls-dates-inputs");
    nextWeek.innerHTML = "&rarr;";
    this.addEventListener("keydown", (e) => {
      if(e.key === "ArrowRight"){
        nextWeek.click();
      }
    });
    nextWeek.addEventListener("click", () => {
      const end = this.#inputValueToZonedDateTime(this.endInput.value);
      if (!end) return;
      previousWeek.disabled = false;
      const newStart = end;
      let newEnd = end.add({ days: 7 });
      if((newEnd.toInstant().epochMilliseconds / 1000) > this.maxTime){
        newEnd = Temporal.Instant.fromEpochMilliseconds(this.maxTime * 1000).toZonedDateTimeISO(this.timeZone);
        nextWeek.disabled = true;
      }
      this.startInput.value = this.#zonedDateTimeToLocalInputValue(newStart);
      this.endInput.value = this.#zonedDateTimeToLocalInputValue(newEnd);
      this.filterAndUpdateData(newStart, newEnd);
    });
    const breakElement = document.createElement("span");
    breakElement.classList.add("controls-break");
    controls.appendChild(previousWeek);
    controls.appendChild(this.startInput);
    controls.appendChild(breakElement);
    controls.appendChild(this.endInput);
    controls.appendChild(nextWeek);
    this.appendChild(controls);
    this.focus();
  }

  /**
   * handles the fixed date view
   */
  #handleFixedDateView(){
    if(!this.hasAttribute("showdatepicker") && (!this.hasAttribute("startdate") || !this.hasAttribute("enddate"))){
      console.warn("Start and Endate are not chosen, all data is presented!");
    } else if(!this.hasAttribute("showdatepicker")){
      this.filterAndUpdateData(Temporal.ZonedDateTime.from(this.getAttribute("startdate")), Temporal.ZonedDateTime.from(this.getAttribute("enddate")));
    }
  }

  /**
   * Generalizes the data stored in the results list:
   * ensures that all Results objects have the same timestamps and fill up missing data.
   * if the first chart has data from e.g. 03:00 to 05:00 and the second from 04:00 to 06:00 after this function
   * both will have data from 03:00 to 06:00 with null values in 03:00 to 04:00 for the second and from 05:00 to 06:00 for the first
   * so we can show all available data
   */
  #generalizeData(){
    if (this.results.length === 0){
      return;
    }
    const tsSet = new Set<number>();
    for (const res of this.results) {
      for (const t of res.timestamps) tsSet.add(t);
    }
    const allTimestamps = Array.from(tsSet).sort((a, b) => a - b);

    // align each result to the common timeline, filling missing entries with null to not show missing data
    for (const res of this.results) {
      let key: keyof typeof Values;
      for (const key in res.values){
        const map = new Map<number, number[]>();
        for (let i = 0; i < res.timestamps.length; i++) {
          map.set(res.timestamps[i], res.values[key][i]);
        }
        const newValues = allTimestamps.map(t => map.has(t) ? (map.get(t) ?? null) : null);
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
  #updateValidDateInputs(){
    if(!this.startInput || !this.endInput){
      return;
    }
    this.startInput.min = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.startInput.max = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.min = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.max = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
  }

  /**
   *  Set the start and end input to the values given by the attributes
   * @returns 
   */
  #setStartEndDateToAttributes(){
    if(!this.startInput || !this.endInput){
      return;
    }
    let startdate = Temporal.ZonedDateTime.from(this.getAttribute("startdate"));
    let enddate = Temporal.ZonedDateTime.from(this.getAttribute("enddate"));
    this.startInput.value = this.#zonedDateTimeToLocalInputValue(startdate);
    this.endInput.value = this.#zonedDateTimeToLocalInputValue(enddate);
    this.filterAndUpdateData(startdate, enddate);
  }

  /**
   * 
   * set the Input fields to the widthest available timespan
   */
  #setStartEndDateToMinMax(){
    if(!this.startInput || !this.endInput){
      return;
    }
    this.startInput.value = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.value = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
  }
  
  /**
   * Converts dates into the format of HTML datetime-local inputs
   * @param zdt date to convert
   * @returns string, formated for HTML datetime-local input value
   */
  #zonedDateTimeToLocalInputValue(zdt: Temporal.ZonedDateTime): string {
    // Convert to a PlainDateTime in the same time zone
    const pdt = zdt.toPlainDateTime();

    const yyyy = pdt.year.toString().padStart(4, "0");
    const mm = pdt.month.toString().padStart(2, "0");
    const dd = pdt.day.toString().padStart(2, "0");
    const hh = pdt.hour.toString().padStart(2, "0");
    const min = pdt.minute.toString().padStart(2, "0");

    // Format required for <input type="datetime-local">
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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
    return pdt.toZonedDateTime(this.timeZone);
  }
  
}

customElements.define("linea-plot", LineaPlot);
