import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import { dewPoint } from "./linea-plot/dewPoint";
import { opts_HS, opts_HS_PSUM, opts_PSUM } from "./linea-plot/opts_HS_PSUM";
import { opts_ISWR, opts_RH, opts_RH_GR } from "./linea-plot/opts_RH_GR";
import {
  opts_TA,
  opts_TA_TD_TSS,
  opts_TD,
  opts_TSS,
} from "./linea-plot/opts_TA_TD_TSS";
import {
  opts_DW,
  opts_VW,
  opts_VW_MAX,
  opts_VW_VWG_DW,
} from "./linea-plot/opts_VW_VWG_DW";
import { fetchSMET } from "./smet-data";

export class LineaPlot extends HTMLElement {
  static observedAttributes = ["src"];
  #plots: uPlot[] = [];
  #resizeObserver = new ResizeObserver(() => this.#resizePlots());

  connectedCallback() {
    this.renderPlots().catch((e) => console.error(e));
  }

  attributeChangedCallback(name: string) {
    if (name === "src") {
      this.renderPlots().catch((e) => console.error(e));
    }
  }

  async renderPlots() {
    this.#resizeObserver.unobserve(this);
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
      const TD =
        values.TD ??
        (values.TA && values.RH
          ? values.TA.map((temp, i) => dewPoint(temp, values.RH[i]))
          : undefined);
      const p = new uPlot(
        {
          ...opts_TA_TD_TSS,
          title: `${station} (${i18n.number(altitude, { maximumFractionDigits: 0 })}m)`,
        },
        [timestamps],
        plot_TA_TD_TSS
      );
      this.#addSeries(p, opts_TA, values.TA);
      this.#addSeries(p, opts_TD, TD);
      this.#addSeries(p, opts_TSS, values.TSS);
    }

    if (values.VW && values.DW) {
      const p = new uPlot(opts_VW_VWG_DW, [timestamps], plot_VW_VWG_DW);
      this.#addSeries(p, opts_VW, values.VW);
      this.#addSeries(p, opts_VW_MAX, values.VW_MAX);
      this.#addSeries(p, opts_DW, values.DW);
    }

    if (values.HS || values.PSUM) {
      const p = new uPlot(opts_HS_PSUM, [timestamps], plot_HS_PSUM);
      this.#addSeries(p, opts_HS, values.HS);
      this.#addSeries(p, opts_PSUM, values.PSUM);
    }

    if (values.RH || values.ISWR) {
      const p = new uPlot(opts_RH_GR, [timestamps], plot_RH_GR);
      this.#addSeries(p, opts_RH, values.RH);
      this.#addSeries(p, opts_ISWR, values.ISWR);
    }

    this.#resizePlots();
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.#resizeObserver.unobserve(this);
  }

  #addSeries(plot: uPlot, series: uPlot.Series, data: Float32Array) {
    if (!this.#plots.includes(plot)) {
      this.#plots.push(plot);
    }
    plot.addSeries({ ...series, show: !!data?.length });
    plot.data.push(data ?? []);
  }

  #resizePlots() {
    this.#plots.forEach((p) =>
      p.setSize({
        width: this.clientWidth,
        height: p.height,
      })
    );
  }
}

customElements.define("linea-plot", LineaPlot);
