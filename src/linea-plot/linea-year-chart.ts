import uPlot from "uplot";
import { i18n } from "../i18n";
import {
  opts_HS_year_current,
  opts_HS_year_max,
  opts_HS_year_median,
  opts_HS_year_min,
  opts_HS_year_PSUM,
  opts_HS_year,
} from "./opts_HS_PSUM_year";
import {
  opts_TEMP_year,
  opts_DEW_year_current,
  opts_TEMP_year_current,
  opts_TEMP_year_max,
  opts_TEMP_year_median,
  opts_TEMP_year_min,
} from "./opts_TEMP_year";

import { opts_NS_year, opts_NS_year_series, opts_NS_year_snow_cover } from "./opts_NS_year";

import { opts_DATAPOINTS_year, opts_DATAPOINTS_amount_year } from "./opts_datapoints_year";
import { YearData } from "../data/year-data";
import { AbstractLineaChart } from "../abstract-linea-chart";
import type { ForecastValues, StationData, Values } from "../data/station-data";
import { TouchZoom } from "../shared/touch-zoom";
import { MeasurementDatesPlugin } from "../shared/measurement-dates";

/**
 * This component creates interactive uPlot diagrams displaying:
 * - Snow height (HS) with min/median/max aggregates and precipitation (PSUM)
 * - New snow (NS) with snow cover overlay
 * - Temperature (TA) with min/median/max aggregates and surface temperature (TSS)
 * - Data point counts for quality assessment
 *
 * @remarks
 * The component expects SMET file input containing daily measurement data.
 * Data is aggregated by calendar day and rendered between specified date ranges.
 * Requires Temporal API for date handling.
 *
 *
 * @extends AbstractLineaChart
 *
 */
export class LineaYearChart extends AbstractLineaChart {
  public startDate: Temporal.PlainDate;
  public endDate: Temporal.PlainDate;

  private withFreshPlugins(opts: uPlot.Options): uPlot.Options {
    return {
      ...opts,
      plugins: [TouchZoom.touchZoomPlugin(), new MeasurementDatesPlugin().plugin()],
    };
  }

  constructor(
    result: StationData,
    showTitle: boolean,
    backgroundColor: string,
    startDate: Temporal.PlainDate,
    endDate: Temporal.PlainDate,
  ) {
    super(backgroundColor, showTitle, result);
    this.result = result;
    this.startDate = startDate;
    this.endDate = endDate;
    this.createPlots().catch((e) => console.error(e));
  }

  updateStartEndDate(startDate: Temporal.ZonedDateTime, endDate: Temporal.ZonedDateTime) {
    this.startDate = startDate.toPlainDate();
    this.endDate = endDate.toPlainDate();
    this.setData(this.result.timestamps, this.result.values);
  }

  setData(timestamps: number[], values: Values, _forecast?: ForecastValues) {
    this.result.timestamps = timestamps;
    this.result.values = values;
    let i = 0;
    let yearDataHS;
    if (this.result.values.HS) {
      yearDataHS = YearData.from(
        i18n.timezone(),
        this.startDate,
        this.endDate,
        timestamps,
        values.HS,
      );
      if (this.result.values.PSUM) {
        const yearDataPSUM = YearData.from(
          i18n.timezone(),
          this.startDate,
          this.endDate,
          timestamps,
          values.PSUM,
        );
        this.updateData(this.plots[i], [
          yearDataHS.timestamps,
          yearDataHS.minValues,
          yearDataHS.maxValues,
          yearDataHS.medianValues,
          yearDataHS.values,
          yearDataPSUM.values.map((v) => (v == 0 ? null : v)),
        ]);
      } else {
        this.updateData(this.plots[i], [
          yearDataHS.timestamps,
          yearDataHS.minValues,
          yearDataHS.maxValues,
          yearDataHS.medianValues,
          yearDataHS.values,
        ]);
      }
      i += 1;
      this.updateData(this.plots[i], [yearDataHS.timestamps, yearDataHS.amount]);
      i += 1;
    }
    if (this.result.values.NS) {
      const yearDataNS = YearData.from(
        i18n.timezone(),
        this.startDate,
        this.endDate,
        timestamps,
        values.NS,
      );
      if (yearDataHS) {
        this.updateData(this.plots[i], [
          yearDataHS.timestamps,
          yearDataHS.values.map((v) => (v && v > 0 ? 1000 : -1000)),
          yearDataNS.values.map((v) => (v == 0 ? null : v)),
        ]);
      } else {
        this.updateData(this.plots[i], [yearDataNS.timestamps, yearDataNS.values]);
      }
      i += 1;
    }
    if (this.result.values.TA) {
      const yearDataTA = YearData.from(
        i18n.timezone(),
        this.startDate,
        this.endDate,
        timestamps,
        values.TA,
      );
      if (!this.result.values.TSS) {
        this.updateData(this.plots[i], [
          yearDataTA.timestamps,
          yearDataTA.minValues,
          yearDataTA.maxValues,
          yearDataTA.medianValues,
          yearDataTA.values,
        ]);
      } else {
        const yearDataTSS = YearData.from(
          i18n.timezone(),
          this.startDate,
          this.endDate,
          timestamps,
          values.TSS,
        );
        this.updateData(this.plots[i], [
          yearDataTA.timestamps,
          yearDataTA.minValues,
          yearDataTA.maxValues,
          yearDataTA.medianValues,
          yearDataTA.values,
          yearDataTSS.values,
        ]);
      }
      i += 1;
    }
    this.resizePlots(this.clientWidth, this.style);
  }

  async createPlots() {
    if (!globalThis.Temporal) {
      await import("temporal-polyfill/global");
    }
    const { timestamps, values } = this.result;

    this.resizeObserver.unobserve(this);

    const plot_HS_year = document.createElement("div");
    const plot_NS_year = document.createElement("div");
    const plot_TEMP_year = document.createElement("div");
    const plot_DATAPOINTS_year = document.createElement("div");
    this.replaceChildren(plot_HS_year, plot_NS_year, plot_TEMP_year, plot_DATAPOINTS_year);

    const timeZone = i18n.timezone();

    if (values.HS) {
      const yearDataHS = YearData.from(
        timeZone,
        this.startDate,
        this.endDate,
        timestamps,
        values.HS,
      );
      const p = new uPlot(
        this.withFreshPlugins({
          ...opts_HS_year,
          ...this.getStationTitle(),
        }),
        [yearDataHS.timestamps],
        plot_HS_year,
      );
      this.drawedTitle = true;
      this.addSeries(p, opts_HS_year_min, yearDataHS.minValues);
      this.addSeries(p, opts_HS_year_max, yearDataHS.maxValues);
      this.addSeries(p, opts_HS_year_median, yearDataHS.medianValues);
      this.addSeries(p, opts_HS_year_current, yearDataHS.values);
      if (values.PSUM) {
        const yearDataPSUM = YearData.from(
          timeZone,
          this.startDate,
          this.endDate,
          timestamps,
          values.PSUM.map((v) => (v == 0 ? null : v)),
        );
        this.addSeries(p, opts_HS_year_PSUM, yearDataPSUM.values);
      }
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:precipitation"));

      const pDatapoints = new uPlot(
        this.withFreshPlugins({
          ...opts_DATAPOINTS_year,
          ...this.getStationTitle(),
        }),
        [yearDataHS.timestamps],
        plot_DATAPOINTS_year,
      );
      this.drawedTitle = true;
      this.addSeries(pDatapoints, opts_DATAPOINTS_amount_year, yearDataHS.amount);
      this.modifyDrawHook(pDatapoints, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:datapoints"));
    }

    if (values.NS) {
      const yearDataNS = YearData.from(
        timeZone,
        this.startDate,
        this.endDate,
        timestamps,
        values.NS,
      );
      let pNewSnow = new uPlot(
        this.withFreshPlugins({
          ...opts_NS_year,
          ...this.getStationTitle(),
        }),
        [yearDataNS.timestamps],
        plot_NS_year,
      );
      this.drawedTitle = true;
      if (values.HS) {
        const yearDataHS = YearData.from(
          timeZone,
          this.startDate,
          this.endDate,
          timestamps,
          values.HS,
        );
        this.addSeries(
          pNewSnow,
          opts_NS_year_snow_cover,
          yearDataHS.values.map((v) => (v && v > 0 ? 1000 : -1000)),
        );
      }
      this.addSeries(
        pNewSnow,
        opts_NS_year_series,
        yearDataNS.values.map((v) => (v == 0 ? null : v)),
      );
      this.modifyDrawHook(pNewSnow, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:newsnow"));
    }

    if (values.TA) {
      const yearDataTA = YearData.from(
        timeZone,
        this.startDate,
        this.endDate,
        timestamps,
        values.TA,
      );
      const pTemp = new uPlot(
        this.withFreshPlugins({
          ...opts_TEMP_year,
          ...this.getStationTitle(),
        }),
        [yearDataTA.timestamps],
        plot_TEMP_year,
      );
      this.drawedTitle = true;
      this.addSeries(pTemp, opts_TEMP_year_min, yearDataTA.minValues);
      this.addSeries(pTemp, opts_TEMP_year_max, yearDataTA.maxValues);
      this.addSeries(pTemp, opts_TEMP_year_median, yearDataTA.medianValues);
      this.addSeries(pTemp, opts_TEMP_year_current, yearDataTA.values);
      if (values.TSS) {
        const yearDataTSS = YearData.from(
          timeZone,
          this.startDate,
          this.endDate,
          timestamps,
          values.TSS,
        );
        this.addSeries(pTemp, opts_DEW_year_current, yearDataTSS.values);
      }
      this.modifyDrawHook(pTemp, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:temperature"));
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  protected getStationTitle(): {} {
    return this.showTitle && !this.drawedTitle
      ? {
          title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m), ${i18n.message("linea:title:since")} ${new Date(this.result.timestamps[0]).getFullYear()}`,
        }
      : {};
  }
}

customElements.define("linea-year-chart", LineaYearChart);
