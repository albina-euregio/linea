import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { opts_HS_PSUM } from "./linea-plot/opts_HS_PSUM";
import { opts_RH_GR } from "./linea-plot/opts_RH_GR";
import { opts_TA_TD_TSS } from "./linea-plot/opts_TA_TD_TSS";
import { opts_VW_VWG_DW } from "./linea-plot/opts_VW_VWG_DW";
import { fetchSMET } from "./smet-data";

export class LineaPlot extends HTMLElement {
  async connectedCallback() {
    const timeRangeMilli = Infinity;
    const { timestamps, values } = await fetchSMET(
      this.getAttribute("src") ?? "",
      timeRangeMilli
    );
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(
      plot_TA_TD_TSS,
      plot_VW_VWG_DW,
      plot_HS_PSUM,
      plot_RH_GR
    );
    if (values.TA) {
      new uPlot(
        opts_TA_TD_TSS,
        [timestamps, values.TA, values.TD ?? [], values.TSS ?? []],
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
}

customElements.define("linea-plot", LineaPlot);
