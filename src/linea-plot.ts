import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import { fetchSMET, Result } from "./smet-data";
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
    this.endInput = document.createElement("input");
    this.endInput.type = "datetime-local";
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

  #inputValueToZonedDateTime(value: string, timeZone: string) {
    // value = "2025-06-04T10:24"
    const pdt = Temporal.PlainDateTime.from(value);
    return pdt.toZonedDateTime(timeZone);
  }
  
}

customElements.define("linea-plot", LineaPlot);
