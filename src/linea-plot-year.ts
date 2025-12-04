import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import {
  opts_HS_year_current,
  opts_HS_year_max,
  opts_HS_year_median,
  opts_HS_year_min,
  opts_HS_year_PSUM,
  opts_HS_year,
} from "./linea-plot/opts_HS_PSUM_year";
 import {
  opts_TEMP_year,
  opts_DEW_year_current,
  opts_TEMP_year_current,
  opts_TEMP_year_max,
  opts_TEMP_year_median,
  opts_TEMP_year_min,
 } from "./linea-plot/opts_TEMP_year.ts";
 
import { 
  opts_NS_year, 
  opts_NS_year_series,
  opts_NS_year_snow_cover,
 } from "./linea-plot/opts_NS_year";

 import { opts_DATAPOINTS_year, opts_DATAPOINTS_amount_year} from "./linea-plot/opts_datapoints_year.ts";
import { fetchSMET } from "./smet-data";
import { Temporal } from "temporal-polyfill";
import { PlotHelper } from "./plot-helper";
import { YearData } from "./linea-plot/yeardata.ts";

/**
 * uPlot diagram for yearly overview of snow height.
 * 
 * Expect `src` to be a SMET file containing daily snow height data from the beginning of measurement.
 * Aggregate the data by each calendar day into min/median/max.
 * Render snow height between `startDate` and `endDate`.
 */
export class LineaPlotYear extends HTMLElement {
  static observedAttributes = ["src"];
  #m_style?: HTMLStyleElement;
  #plots: uPlot[] = [];
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
    const { station, altitude, timestamps, values } = await fetchSMET(
      this.getAttribute("src") ?? ""
    );
    const scale = this.#GetScale(this.clientWidth);
    const style = document.createElement("style");
    style.textContent = css;
    const plot_HS_year = document.createElement("div");
    const plot_NS_year = document.createElement("div");
    const plot_TEMP_year = document.createElement("div");
    const plot_DATAPOINTS_year = document.createElement("div");
    this.replaceChildren(style, plot_HS_year, plot_NS_year, plot_TEMP_year, plot_DATAPOINTS_year);

    const startDate = Temporal.PlainDate.from(this.getAttribute("startDate")!);
    const endDate = Temporal.PlainDate.from(this.getAttribute("endDate")!);
    const timeZone = this.getAttribute("timeZone") || "CET";
    
    const yearData = YearData.from(timeZone, startDate, endDate, timestamps, values);
    if(values.HS) {
      const p = new uPlot(
        {
          ...opts_HS_year,
          ...(this.hasAttribute("showTitle")
            ? {
                title: `${station} (${i18n.number(altitude, { maximumFractionDigits: 0 })}m)`,
              }
            : {}),
        },
        [yearData.timestamps],
        plot_HS_year
      );
      this.#addSeries(p, opts_HS_year_min, yearData.HS_min);
      this.#addSeries(p, opts_HS_year_max, yearData.HS_max);
      this.#addSeries(p, opts_HS_year_median, yearData.HS_median);
      this.#addSeries(p, opts_HS_year_current, yearData.HS);
      if(values.PSUM){
        this.#addSeries(p, opts_HS_year_PSUM, yearData.PSUM);
      }
      const pDatapoints = new uPlot(opts_DATAPOINTS_year, [yearData.timestamps], plot_DATAPOINTS_year);
      this.#addSeries(pDatapoints, opts_DATAPOINTS_amount_year, yearData.N);
    }
    if(values.NS){
      let pNewSnow = new uPlot(opts_NS_year, [yearData.timestamps], plot_NS_year);
      this.#addSeries(pNewSnow, opts_NS_year_snow_cover, yearData.HS.map(v => ((v == 0 || Number.isNaN(v)) ? 1000 : -1000)));
      this.#addSeries(pNewSnow, opts_NS_year_series, yearData.NS);
    }
    if(values.TA || values.TD){
      const pTemp = new uPlot(opts_TEMP_year, [yearData.timestamps], plot_TEMP_year);
      if(values.TA){ 
        this.#addSeries(pTemp, opts_TEMP_year_min, yearData.TA_min);
        this.#addSeries(pTemp, opts_TEMP_year_max, yearData.TA_max);
        this.#addSeries(pTemp, opts_TEMP_year_median, yearData.TA_median);
        this.#addSeries(pTemp, opts_TEMP_year_current, yearData.TA);
      }
      if(values.TD) {
        this.#addSeries(pTemp, opts_DEW_year_current, yearData.TD);
      }
    }

    this.#resizePlots(this.clientWidth, this.style);
    this.#resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.#resizeObserver.unobserve(this);
  }

  #resizePlots(clientWidth: number, style: CSSStyleDeclaration) {
    this.#plots.forEach((p) =>
      p.setSize({
        width: clientWidth,
        height: p.height,
      }));
    // compute a scale factor based on element width so text shrinks on narrow layouts
    const baseWidth = 360; // width at which scale == 1
    const minScale = 0.6; // don't shrink below this
    const scale =  Math.max(minScale, Math.min(1, clientWidth / baseWidth));
    //this.style.setProperty("--plot-scale", String(scale));
    if(style){
      style.fontSize =`${12 * scale}px`;
      style.padding =`${6 * scale}px ${10 * scale}px`;
    }
    this.#plots.forEach((p) =>
      p.setSize({
        width: clientWidth,
        height: p.height,
      })
    );
  }

  #addSeries(plot: uPlot, series: uPlot.Series, data: number[]) {
    if (!this.#plots.includes(plot)) {
      this.#plots.push(plot);
    }        
    if (!data) {
      console.warn("addSeries called with undefined data", series.label);
      data = [] as number[];
    }
    plot.addSeries({ ...series, show: !!data?.length });
    plot.data.push(data);
  }

  #GetScale(clientWidth: number): number {
    const baseWidth = 360;
    const minScale = 0.6;
    return Math.max(minScale, Math.min(1, clientWidth / baseWidth));
  }
  
  #GetStyle(document: Document, css: string): HTMLStyleElement{
    if(!this.#m_style){
      this.#CreateStyle(document, css);
    }
    return this.#m_style;
  }

  //#region Private Methods
  #CreateStyle(document: Document, css: string): HTMLStyleElement {
    const style = document.createElement("style");
    style.textContent = css;
    style.textContent = `
      .vw-max-plot .u-axis-label {
        transform-origin: left top;
        white-space: nowrap;
      }

      .hs-year-plot .u-axis-label {
        transform-origin: left top;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
    this.#m_style = style;
    return style;
  }

}

customElements.define("linea-plot-year", LineaPlotYear);
