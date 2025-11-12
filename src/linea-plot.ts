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

  #makeAxes(scale: number) {
    const baseAxisSize = 50;
    const axisSize = baseAxisSize * scale;
    const smallAxisSize = 5 * scale;
    const fontSize = Math.min(32 * scale, 12);
    return [
      {
        side: 2, // bottom x-axis
        size: axisSize,
        font: `${fontSize}px sans-serif`,
      },
      {
        side: 3, // left y-axis
        size: smallAxisSize,
        font: `${fontSize}px sans-serif`,
      },
      {
        side: 1, // right y-axis
        size: smallAxisSize,
        font: `${fontSize}px sans-serif`,
      }
    ];
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
    /*this.style.overflow = "visible";*/
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

    const baseWidth = 360;
    const minScale = 0.6;
    const scale = Math.max(minScale, Math.min(1, this.clientWidth / baseWidth));
    const baseAxisSize = 50;
    const axisSize = baseAxisSize * scale;
    const smallAxisSize = 5 * scale;

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
            axes: this.#makeAxes(scale)
        },
        [timestamps],
        plot_TA_TD_TSS
      );
      this.#addSeries(p, opts_TA, values.TA);
      this.#addSeries(p, opts_TD, TD);
      this.#addSeries(p, opts_TSS, values.TSS);

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
    }

    if (values.VW && values.DW) {
      const p = new uPlot({...opts_VW_VWG_DW, axes: this.#makeAxes(scale*2/3)}, [timestamps], plot_VW_VWG_DW);
      this.#addSeries(p, opts_VW, values.VW);
      this.#addSeries(p, opts_VW_MAX, values.VW_MAX);
      this.#addSeries(p, opts_DW, values.DW);
    }

    if (values.HS || values.PSUM) {
      const p = new uPlot({...opts_HS_PSUM, axes: this.#makeAxes(scale)}, [timestamps], plot_HS_PSUM);
      this.#addSeries(p, opts_HS, values.HS);
      this.#addSeries(p, opts_PSUM, values.PSUM);
    }

    if (values.RH || values.ISWR) {
      const p = new uPlot({...opts_RH_GR, axes: this.#makeAxes(scale*2/3)}, [timestamps], plot_RH_GR);
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
    // compute a scale factor based on element width so text shrinks on narrow layouts
    const baseWidth = 360; // width at which scale == 1
    const minScale = 0.6; // don't shrink below this
    const scale =  Math.max(minScale, Math.min(1, this.clientWidth / baseWidth));
    //this.style.setProperty("--plot-scale", String(scale));
    this.style.fontSize =`${12 * scale}px`;
    this.style.padding =`${6 * scale}px ${10 * scale}px`;
    if (this.#controls) {
     const btns = this.#controls.querySelectorAll<HTMLButtonElement>(".toggle-btn");
     btns.forEach((b) => {
       b.style.fontSize = `${12 * scale}px`;
       b.style.padding = `${6 * scale}px ${10 * scale}px`;
     });
   }
    this.#plots.forEach((p) =>
      p.setSize({
        width: this.clientWidth,
        height: p.height,
      })
    );
  }
}

customElements.define("linea-plot", LineaPlot);
