import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { fetchSMET } from "./smet-data";
import { opts_TA_TD_TSS } from "./linea-plot/opts_TA_TD_TSS";

export class LineaPlot extends HTMLElement {
  async connectedCallback() {
    const showShadedAreas = false;
    const timeRangeMilli = Infinity;
    const data = await fetchSMET(
      this.getAttribute("src") ?? "",
      [{ id: "TA" }, { id: "TD" }, { id: "TSS" }],
      timeRangeMilli
    );
    const div = document.createElement("div");
    this.replaceChildren(div);
    new uPlot(opts_TA_TD_TSS, data, this);
  }
}

customElements.define("linea-plot", LineaPlot);
