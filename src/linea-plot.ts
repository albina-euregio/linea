import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import { dewPoint } from "./linea-plot/dewPoint";
import { opts_HS, opts_HS_PSUM, opts_PSUM } from "./linea-plot/opts_HS_PSUM";
import { opts_ISWR, opts_RH, opts_RH_GR } from "./linea-plot/opts_RH_GR";
import { PlotHelper } from "./plot-helper";
import {
  opts_TA,
  opts_TA_TD_TSS,
  opts_TD,
  opts_TSS,
  showSurfaceHoar,
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
  #controls?: HTMLElement;
  #resizeObserver = new ResizeObserver(() => this.#resizePlots());

  connectedCallback() {
    this.renderPlots().catch((e) => console.error(e));
  }

  attributeChangedCallback(name: string) {
    if (name === "src" || name == "timeRangeMilli") {
      this.renderPlots().catch((e) => console.error(e));
    }
  }

  async renderPlots() {
    this.#resizeObserver.unobserve(this);
    const timeRangeMilli = this.getAttribute("timeRangeMilli");
    const { station, altitude, timestamps, values } = await fetchSMET(
      this.getAttribute("src") ?? "",
      timeRangeMilli ? +timeRangeMilli : Infinity
    );
    const style = document.createElement("style");
    style.textContent = css;
    const controls = document.createElement("div");
    controls.classList.add("controls");
    this.#controls = controls;   
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(
      style,
      controls,
      plot_TA_TD_TSS,
      plot_VW_VWG_DW,
      plot_HS_PSUM,
      plot_RH_GR
    );
    const plotHelper = new PlotHelper();
    const scale = plotHelper.GetScale(this.clientWidth);

    if (values.TA) {
      const TD =
        values.TD ??
        (values.TA && values.RH
          ? values.TA.map((temp, i) => dewPoint(temp, values.RH[i]))
          : undefined);
      const p = new uPlot(
        {
          ...opts_TA_TD_TSS,
          ...(this.hasAttribute("showTitle")
            ? {
                title: `${station} (${i18n.number(altitude, { maximumFractionDigits: 0 })}m)`,
              }
            : {}),
            axes: plotHelper.makeAxes(scale)
        },
        [timestamps],
        plot_TA_TD_TSS
      );
      plotHelper.addSeries(this.#plots, p, opts_TA, values.TA);
      plotHelper.addSeries(this.#plots, p, opts_TD, TD);
      
      // show snow surface temperature and therefore surface hoar only if available
      if(values.TSS) {
        plotHelper.addSeries(this.#plots, p, opts_TSS, values.TSS);
        //show surface hoar button
        if (this.hasAttribute("showSurfaceHoarButton")) {
          const button = document.createElement("button");
          button.classList.add("toggle-btn");
          button.innerText = i18n.message(
            "dialog:weather-station-diagram:parameter:SH:hide"
          );
          controls.append(button);
          button.onclick = () => {
            showSurfaceHoar.value = !showSurfaceHoar.value;
            button.innerText = i18n.message(
              showSurfaceHoar.value
                ? "dialog:weather-station-diagram:parameter:SH:hide"
                : "dialog:weather-station-diagram:parameter:SH:show"
            );
            p.redraw();
          };
        }
      } else {
        plotHelper.addSeries(this.#plots, p, opts_TSS, new Float32Array([]));
      }
    }

    if (values.VW && values.DW) {
      const p = new uPlot({...opts_VW_VWG_DW, axes: plotHelper.makeAxes(scale)}, [timestamps], plot_VW_VWG_DW);           
      plotHelper.addSeries(this.#plots, p, opts_VW, values.VW);
      plotHelper.addSeries(this.#plots, p, opts_VW_MAX, values.VW_MAX);
      plotHelper.addSeries(this.#plots,p, opts_DW, values.DW);
    }

    if (values.HS || values.PSUM) {
      const p = new uPlot({...opts_HS_PSUM, axes: plotHelper.makeAxes(scale)}, [timestamps], plot_HS_PSUM);
      plotHelper.addSeries(this.#plots, p, opts_HS, values.HS);
      plotHelper.addSeries(this.#plots, p, opts_PSUM, values.PSUM);
    }

    if (values.RH || values.ISWR) {
      const p = new uPlot({...opts_RH_GR, axes: plotHelper.makeAxes(scale)}, [timestamps], plot_RH_GR);
      plotHelper.addSeries(this.#plots, p, opts_RH, values.RH);
      plotHelper.addSeries(this.#plots, p, opts_ISWR, values.ISWR);
    }

    plotHelper.resizePlots(this.#plots, this.clientWidth, this.style, this.#controls);
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.#resizeObserver.unobserve(this);
  }

  #resizePlots() {
    const plotHelper = new PlotHelper();
    plotHelper.resizePlots(this.#plots, this.clientWidth, this.style, null);
  }
}

customElements.define("linea-plot", LineaPlot);
