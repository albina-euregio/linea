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
import { YearData } from "./linea-plot/yeardata.ts";
import { AbstractLineaChart } from "./linea-plot/AbstractLineaChart.ts";

/**
 * uPlot diagram for yearly overview of snow height.
 * 
 * Expect `src` to be a SMET file containing daily snow height data from the beginning of measurement.
 * Aggregate the data by each calendar day into min/median/max.
 * Render snow height between `startDate` and `endDate`.
 */
export class LineaPlotYear extends AbstractLineaChart {
  static observedAttributes = ["src"];

  connectedCallback() {
    this.renderPlots().catch((e) => console.error(e));
  }

  attributeChangedCallback(name: string) {
    if (name === "src" || name == "timeRangeMilli") {
      this.renderPlots().catch((e) => console.error(e));
    }
  }

  async renderPlots() {
    this.resizeObserver.unobserve(this);
    const { station, altitude, timestamps, values } = await fetchSMET(
      this.getAttribute("src") ?? ""
    );
    const scale = this.GetScale(this.clientWidth);
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
      this.addSeries(p, opts_HS_year_min, yearData.HS_min);
      this.addSeries(p, opts_HS_year_max, yearData.HS_max);
      this.addSeries(p, opts_HS_year_median, yearData.HS_median);
      this.addSeries(p, opts_HS_year_current, yearData.HS);
      if(values.PSUM){
        this.addSeries(p, opts_HS_year_PSUM, yearData.PSUM);
      }
      const pDatapoints = new uPlot(opts_DATAPOINTS_year, [yearData.timestamps], plot_DATAPOINTS_year);
      this.addSeries(pDatapoints, opts_DATAPOINTS_amount_year, yearData.N);
    }
    if(values.NS){
      let pNewSnow = new uPlot(opts_NS_year, [yearData.timestamps], plot_NS_year);
      this.addSeries(pNewSnow, opts_NS_year_snow_cover, yearData.HS.map(v => ((v == 0 || Number.isNaN(v)) ? 1000 : -1000)));
      this.addSeries(pNewSnow, opts_NS_year_series, yearData.NS);
    }
    if(values.TA || values.TD){
      const pTemp = new uPlot(opts_TEMP_year, [yearData.timestamps], plot_TEMP_year);
      if(values.TA){ 
        this.addSeries(pTemp, opts_TEMP_year_min, yearData.TA_min);
        this.addSeries(pTemp, opts_TEMP_year_max, yearData.TA_max);
        this.addSeries(pTemp, opts_TEMP_year_median, yearData.TA_median);
        this.addSeries(pTemp, opts_TEMP_year_current, yearData.TA);
      }
      if(values.TD) {
        this.addSeries(pTemp, opts_DEW_year_current, yearData.TD);
      }
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.unobserve(this);
  }

}

customElements.define("linea-plot-year", LineaPlotYear);
