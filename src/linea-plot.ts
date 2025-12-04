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
    this.appendChild(controls);

    this.fetchData().then(() => {
      this.#updateValidDateInputs();
      this.#setStartEndDateToMinMax();
      this.render();
    });
  }

  async fetchData(){
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

  render(){
    const backgroundColors = ["rgba(0, 0, 0, 0.05)"]

    for (const i in this.results) {
      const result = this.results[i];
      let lc = new LineaChart(result.timestamps, result.values, result.station, result.altitude, true, true, backgroundColors[i] ?? "#00000000");
      this.lineacharts.push(lc);
      this.appendChild(lc.chart);
    }
    
  }

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

  #updateValidDateInputs(){
    this.startInput.min = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.startInput.max = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.min = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.max = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
  }

  #setStartEndDateToMinMax(){
    this.startInput.value = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.minTime*1000).toZonedDateTimeISO(this.timeZone));
    this.endInput.value = this.#zonedDateTimeToLocalInputValue(Temporal.Instant.fromEpochMilliseconds(this.maxTime*1000).toZonedDateTimeISO(this.timeZone));
  }
    
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

  #inputValueToZonedDateTime(value: string) {
    // value = "2025-06-04T10:24"
    const pdt = Temporal.PlainDateTime.from(value);
    return pdt.toZonedDateTime(this.timeZone);
  }
  
}

customElements.define("linea-plot", LineaPlot);
