import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { opts_TA, opts_TA_TD_TSS, opts_TD, opts_TSS, opts_SurfaceHoar } from "./opts_TA_TD_TSS";
import { opts_DW, opts_VW, opts_VW_MAX, opts_VW_VWG_DW } from "./opts_VW_VWG_DW";
import { opts_HS, opts_HS_PSUM, opts_PSUM } from "./opts_HS_PSUM";
import { opts_ISWR, opts_RH, opts_RH_GR } from "./opts_RH_GR";
import { dewPoint } from "./dewPoint";
import type { Result, Values } from "../data/station-data";
import { i18n } from "../i18n";
import { AbstractLineaChart } from "./AbstractLineaChart";

export class LineaChart extends AbstractLineaChart {
  constructor(
    readonly result: Result,
    showTitle: boolean,
    private showSurfaceHoarSeries: boolean,
    backgroundColor: string,
  ) {
    super(backgroundColor, showTitle, result);
    console.log(result.station, showSurfaceHoarSeries);
    this.createPlots().catch((e) => console.error(e));
  }

  setData(timestamps: number[], values: Values) {
    this.result.timestamps = timestamps;
    this.result.values = values;
    let i = 0;
    if (this.result.values.HS || this.result.values.PSUM) {
      this.updateData(this.plots[i], [this.result.values.HS, this.result.values.PSUM]);
      i += 1;
    }
    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      this.updateData(this.plots[i], [
        this.result.values.VW,
        this.result.values.VW_MAX,
        this.#filterDWData(this.result.values.DW),
      ]);
      i += 1;
    }
    if (this.result.values.TA || this.result.values.TD || this.result.values.TSS) {
      if (this.showSurfaceHoarSeries && this.result.values.TD && this.result.values.TSS) {
        this.updateData(this.plots[i], [
          this.result.values.TA,
          this.result.values.TD ??
            (this.result.values.TA && this.result.values.RH
              ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
              : undefined),
          this.result.values.TSS,
          this.#generateSurfaceHoarData(),
        ]);
      } else {
        this.updateData(this.plots[i], [
          this.result.values.TA,
          this.result.values.TD ??
            (this.result.values.TA && this.result.values.RH
              ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
              : undefined),
          this.result.values.TSS,
        ]);
      }
      i += 1;
    }
    if (this.result.values.RH || this.result.values.ISWR) {
      this.updateData(this.plots[i], [this.result.values.RH, this.result.values.ISWR]);
    }
    this.resizePlots(this.clientWidth, this.style);
  }

  async createPlots() {
    this.resizeObserver.unobserve(this);
    const style = document.createElement("style");
    style.textContent = css;
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(style, plot_HS_PSUM, plot_VW_VWG_DW, plot_TA_TD_TSS, plot_RH_GR);

    if (this.result.values.HS || this.result.values.PSUM) {
      const p = new uPlot(
        {
          ...opts_HS_PSUM,
          ...this.getStationTitle(),
        },
        [this.result.timestamps],
        plot_HS_PSUM,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:precipitation"));
      this.addSeries(p, opts_HS, this.result.values.HS);
      this.addSeries(p, opts_PSUM, this.result.values.PSUM);
    }

    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      const p = new uPlot(
        {
          ...opts_VW_VWG_DW,
          ...this.getStationTitle(),
        },
        [this.result.timestamps],
        plot_VW_VWG_DW,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:wind"));
      this.addSeries(p, opts_VW, this.result.values.VW);
      this.addSeries(p, opts_VW_MAX, this.result.values.VW_MAX);
      this.addSeries(p, opts_DW, this.#filterDWData(this.result.values.DW));
    }

    if (this.result.values.TA) {
      const TD =
        this.result.values.TD ??
        (this.result.values.TA && this.result.values.RH
          ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
          : undefined);
      const p = new uPlot(
        {
          ...opts_TA_TD_TSS,
          ...this.getStationTitle(),
        },
        [this.result.timestamps],
        plot_TA_TD_TSS,
      );
      this.drawedTitle = true;

      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:temperature"));
      this.addSeries(p, opts_TA, this.result.values.TA);
      this.addSeries(p, opts_TD, TD);

      // show snow surface temperature and therefore surface hoar only if available
      if (this.result.values.TSS) {
        this.addSeries(p, opts_TSS, this.result.values.TSS);
        if (this.showSurfaceHoarSeries) {
          const surfacehoar = this.#generateSurfaceHoarData();
          this.addSeries(p, opts_SurfaceHoar, surfacehoar);
        }
      } else {
        this.addSeries(p, opts_TSS, []);
      }
    }

    if (this.result.values.RH || this.result.values.ISWR) {
      const p = new uPlot(
        {
          ...opts_RH_GR,
          ...this.getStationTitle(),
        },
        [this.result.timestamps],
        plot_RH_GR,
      );
      this.drawedTitle = true;
      this.modifyDrawHook(p, this.backgroundColor);
      this.plotnames.push(i18n.message("linea:plotnames:humidity_gr"));
      this.addSeries(p, opts_RH, this.result.values.RH);
      this.addSeries(p, opts_ISWR, this.result.values.ISWR);
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.unobserve(this);
  }

  #filterDWData(values: number[]): (number | null)[] {
    let density = Math.ceil(values.length / 7500);
    let out = values.map((o, i) => (i % density == 0 ? o : null));
    return out;
  }

  /**
   * Uses the objects data to calculate the surface hoar series data.
   * Filters for surface hoar potential which is longer than 1 hour
   *
   * @returns The surface hoar data for the charts data
   */
  #generateSurfaceHoarData(): number[] {
    const result: number[] = [];
    const { TD, TSS } = this.result.values;
    const timestamps = this.result.timestamps;
    const len = TD.length;

    let i = 0;
    while (i < len) {
      if (TD[i] < 0 && TSS[i] < TD[i]) {
        const startIdx = i;
        let endIdx = i;

        while (endIdx + 1 < len && TD[endIdx + 1] < 0 && TSS[endIdx + 1] < TD[endIdx + 1]) {
          endIdx++;
        }

        const duration = timestamps[endIdx] - timestamps[startIdx];
        const mark = duration >= 3600_000 ? 1000 : -100;

        for (let j = startIdx; j <= endIdx; j++) {
          result[j] = mark;
        }

        i = endIdx + 1;
      } else {
        result[i] = -100;
        i++;
      }
    }
    return result;
  }

  protected getStationTitle(): {} {
    return this.showTitle && !this.drawedTitle
      ? {
          title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
        }
      : {};
  }
}

customElements.define("linea-chart", LineaChart);
