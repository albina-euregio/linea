import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { dewPoint } from "./linea-plot/dewPoint";
import { opts_HS_PSUM } from "./linea-plot/opts_HS_PSUM";
import { opts_RH_GR } from "./linea-plot/opts_RH_GR";
import { opts_TA_TD_TSS } from "./linea-plot/opts_TA_TD_TSS";
import { opts_VW_VWG_DW } from "./linea-plot/opts_VW_VWG_DW";
import { fetchSMET } from "./smet-data";

export class LineaPlot extends HTMLElement {
  async connectedCallback() {
    const timeRangeMilli = Infinity;
    const { station, altitude, timestamps, values } = await fetchSMET(
      this.getAttribute("src") ?? "",
      timeRangeMilli
    );
    const style = document.createElement("style");
    style.textContent = css;
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(
      style,
      plot_TA_TD_TSS,
      plot_VW_VWG_DW,
      plot_HS_PSUM,
      plot_RH_GR
    );
    if (values.TA) {
      new uPlot(
        { ...opts_TA_TD_TSS, title: `${station} (${altitude.toFixed(0)}m)` },
        [
          timestamps,
          values.TA,
          values.TD ?? values.TA.map((temp, i) => dewPoint(temp, values.RH[i])),
          values.TSS ?? [],
        ],
        plot_TA_TD_TSS
      );
    }
    if (values.VW && values.DW) {
      new uPlot(
        opts_VW_VWG_DW,
        [timestamps, values.VW, values.VW_MAX ?? [], values.DW],
        plot_VW_VWG_DW
      );
    }
    if (values.HS || values.PSUM) {
      new uPlot(
        opts_HS_PSUM,
        [timestamps, values.HS ?? [], values.PSUM ?? []],
        plot_HS_PSUM
      );
    }
    if (values.RH || values.ISWR) {
      new uPlot(
        opts_RH_GR,
        [timestamps, values.RH ?? [], values.ISWR ?? []],
        plot_RH_GR
      );
    }
  }

  static observedAttributes = ["src"];

  attributeChangedCallback(name: string) {
    if (name === "src") {
      this.connectedCallback();
    }
  }
}

customElements.define("linea-plot", LineaPlot);
