import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import { fetchSMET, Result, Values } from "./smet-data";
import { LineaChart } from "./linea-plot/LineaChart";
import { Temporal } from "temporal-polyfill";

export class LineaPlot extends HTMLElement {


  private startInput!: HTMLInputElement;
  private endInput!: HTMLInputElement;

  private lineacharts: LineaChart[] = [] as LineaChart[];
  private results: Result[] = [] as Result[];

  private timeZone:string = "Europe/Berlin";
  private minTime: number = +Infinity;
  private maxTime: number = -Infinity;

  connectedCallback() {
    const controls = document.createElement("div");
    controls.classList.add("controls");
    if(this.hasAttribute("showdatepicker")){
      this.startInput = document.createElement("input");
      this.startInput.type = "datetime-local";
      this.startInput.addEventListener('change', () => {
        this.filterAndUpdateData(this.#inputValueToZonedDateTime(this.startInput.value), this.#inputValueToZonedDateTime(this.endInput.value));
      });
      this.endInput = document.createElement("input");
      this.endInput.type = "datetime-local";
      this.endInput.addEventListener('change', () => {
        this.filterAndUpdateData(this.#inputValueToZonedDateTime(this.startInput.value), this.#inputValueToZonedDateTime(this.endInput.value));
      });
      controls.appendChild(document.createTextNode("Start Date" + ": "));
      controls.appendChild(this.startInput);
      controls.appendChild(document.createTextNode("End Date" + ": "));
      controls.appendChild(this.endInput);
    }
    this.appendChild(controls);

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
  }

  /**
   * fetches the data, generalizes it and update the valid date inputs
   */
  async fetchAndStoreData(){
    const srcs: string[] = JSON.parse(this.getAttribute("src") ?? "") as string[];
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
    const backgroundColors = ["rgba(0, 0, 0, 0.05)"]

    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(result.timestamps, result.values, result.station, result.altitude, true, true, backgroundColors[i] ?? "#00000000");
      this.lineacharts.push(lc);
      this.appendChild(lc.chart);
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
