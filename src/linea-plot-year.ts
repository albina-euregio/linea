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
} from "./linea-plot/opts_TEMP_year";

import {
  opts_NS_year,
  opts_NS_year_series,
  opts_NS_year_snow_cover,
} from "./linea-plot/opts_NS_year";

import {
  opts_DATAPOINTS_year,
  opts_DATAPOINTS_amount_year,
} from "./linea-plot/opts_datapoints_year";
import { YearData } from "./data/year-data";
import { AbstractLineaChart } from "./linea-plot/AbstractLineaChart";
import { Result } from "./data/station-data";

/**
 * A custom HTML element that renders yearly overview plots for weather station data.
 *
 * This component creates interactive uPlot diagrams displaying:
 * - Snow height (HS) with min/median/max aggregates and precipitation (PSUM)
 * - New snow (NS) with snow cover overlay
 * - Temperature (TA) with min/median/max aggregates and dew point (TD)
 * - Data point counts for quality assessment
 *
 * @remarks
 * The component expects SMET file input containing daily measurement data.
 * Data is aggregated by calendar day and rendered between specified date ranges.
 * Requires Temporal API for date handling.
 *
 * @example
 * ```html
 * <linea-plot-year
 *   src="path/to/data.smet"
 *   startDate="2023-01-01"
 *   endDate="2023-12-31"
 *   timeZone="CET"
 *   showTitle>
 * </linea-plot-year>
 * ```
 *
 * @extends AbstractLineaChart
 *
 * @customElement linea-plot-year
 *
 * @attribute {string} src - Path to SMET file with snow height and weather data
 * @attribute {string} startDate - Start date in ISO format (YYYY-MM-DD)
 * @attribute {string} endDate - End date in ISO format (YYYY-MM-DD)
 * @attribute {string} [timeZone="CET"] - IANA time zone identifier for data aggregation
 * @attribute {boolean} [showTitle] - If present, displays station name and altitude
 */
export class LineaYearChart extends AbstractLineaChart {
  constructor(
    readonly result: Result,
    private showTitle: boolean,
    backgroundColor: string,
  ) {
    super(backgroundColor);
    this.createPlots().catch((e) => console.error(e));
  }

  async createPlots() {
    if (!globalThis.Temporal) {
      await import("temporal-polyfill/global");
    }
    const { station, altitude, timestamps, values } = this.result;

    this.resizeObserver.unobserve(this);

    const style = document.createElement("style");
    style.textContent = css;
    const plot_HS_year = document.createElement("div");
    const plot_NS_year = document.createElement("div");
    const plot_TEMP_year = document.createElement("div");
    const plot_DATAPOINTS_year = document.createElement("div");
    this.replaceChildren(style, plot_HS_year, plot_NS_year, plot_TEMP_year, plot_DATAPOINTS_year);

    const startDate = Temporal.PlainDate.from("2025-10-31");
    const endDate = Temporal.PlainDate.from("2026-05-01");
    const timeZone = "CET";

    if (values.HS) {
      const yearDataHS = YearData.from(timeZone, startDate, endDate, timestamps, values.HS);
      const p = new uPlot(
        {
          ...opts_HS_year,
          ...(this.hasAttribute("showTitle")
            ? {
                title: `${station} (${i18n.number(altitude, { maximumFractionDigits: 0 })}m)`,
              }
            : {}),
        },
        [yearDataHS.timestamps],
        plot_HS_year,
      );
      this.addSeries(p, opts_HS_year_min, yearDataHS.minValues);
      this.addSeries(p, opts_HS_year_max, yearDataHS.maxValues);
      this.addSeries(p, opts_HS_year_median, yearDataHS.medianValues);
      this.addSeries(p, opts_HS_year_current, yearDataHS.values);
      if (values.PSUM) {
        const yearDataPSUM = YearData.from(timeZone, startDate, endDate, timestamps, values.PSUM);
        this.addSeries(p, opts_HS_year_PSUM, yearDataPSUM.values);
      }
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:precipitation"));

      const pDatapoints = new uPlot(
        opts_DATAPOINTS_year,
        [yearDataHS.timestamps],
        plot_DATAPOINTS_year,
      );
      this.addSeries(pDatapoints, opts_DATAPOINTS_amount_year, yearDataHS.amount);
      this.modifyDrawHook(pDatapoints, this.backgroundColor);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:datapoints"));
    }

    if (values.NS) {
      const yearDataNS = YearData.from(timeZone, startDate, endDate, timestamps, values.NS);
      let pNewSnow = new uPlot(opts_NS_year, [yearDataNS.timestamps], plot_NS_year);
      if (values.HS) {
        const yearDataHS = YearData.from(timeZone, startDate, endDate, timestamps, values.HS);
        this.addSeries(
          pNewSnow,
          opts_NS_year_snow_cover,
          yearDataHS.values.map((v) => (v == 0 || Number.isNaN(v) ? 1000 : -1000)),
        );
      }
      this.addSeries(pNewSnow, opts_NS_year_series, yearDataNS.values);
      this.modifyDrawHook(pNewSnow, this.backgroundColor);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:newsnow"));
    }

    if (values.TA) {
      const yearDataTA = YearData.from(timeZone, startDate, endDate, timestamps, values.TA);
      const pTemp = new uPlot(opts_TEMP_year, [yearDataTA.timestamps], plot_TEMP_year);
      this.addSeries(pTemp, opts_TEMP_year_min, yearDataTA.minValues);
      this.addSeries(pTemp, opts_TEMP_year_max, yearDataTA.maxValues);
      this.addSeries(pTemp, opts_TEMP_year_median, yearDataTA.medianValues);
      this.addSeries(pTemp, opts_TEMP_year_current, yearDataTA.values);
      if (values.TD) {
        const yearDataTD = YearData.from(timeZone, startDate, endDate, timestamps, values.TD);
        this.addSeries(pTemp, opts_DEW_year_current, yearDataTD.values);
      }
      this.modifyDrawHook(pTemp, this.backgroundColor);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:temperature"));
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }
}

customElements.define("linea-year-chart", LineaYearChart);
