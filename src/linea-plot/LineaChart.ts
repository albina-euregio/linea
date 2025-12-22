import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { opts_TA, opts_TA_TD_TSS, opts_TD, opts_TSS, opts_SurfaceHoar } from "./opts_TA_TD_TSS";
import { opts_DW, opts_VW, opts_VW_MAX, opts_VW_VWG_DW } from "./opts_VW_VWG_DW";
import { opts_HS, opts_HS_PSUM, opts_PSUM } from "./opts_HS_PSUM";
import { opts_ISWR, opts_RH, opts_RH_GR } from "./opts_RH_GR";
import { dewPoint } from "./dewPoint";
import { Result, Values } from "../smet-data";
import { i18n } from "../i18n";
import { AbstractLineaChart } from "./AbstractLineaChart";

export class LineaChart extends AbstractLineaChart {

  private drawedTitle: boolean = false;

  constructor(
    readonly result: Result,
    private showTitle: boolean,
    private showSurfaceHoarSeries: boolean,
    private backgroundColor: string,
  ) {
    super();
    this.createPlots().catch((e) => console.error(e));
  }

  setData(timestamps: number[], values: Values) {
    this.result.timestamps = timestamps;
    this.result.values = values;
    let i = 0;
    if (this.result.values.TA || this.result.values.TD || this.result.values.TSS) {
      if (this.showSurfaceHoarSeries && this.result.values.TD && this.result.values.TSS) {
        this.#updateData(this.plots[i], [
          this.result.values.TA,
          this.result.values.TD ??
          (this.result.values.TA && this.result.values.RH
            ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
            : undefined),
          this.result.values.TSS,
          this.result.values.TD.map((td, i) => {
            return td < 0 && this.result.values.TSS[i] < td ? 1000 : -100;
          }),
        ]);
      } else {
        this.#updateData(this.plots[i], [
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
    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      this.#updateData(this.plots[i], [
        this.result.values.VW,
        this.result.values.VW_MAX,
        this.result.values.DW,
      ]);
      i += 1;
    }
    if (this.result.values.HS || this.result.values.PSUM) {
      this.#updateData(this.plots[i], [this.result.values.HS, this.result.values.PSUM]);
      i += 1;
    }
    if (this.result.values.RH || this.result.values.ISWR) {
      this.#updateData(this.plots[i], [this.result.values.RH, this.result.values.ISWR]);
    }
    this.resizePlots(this.clientWidth, this.style);
  }

  setBackgroundColor(color: string) {
    this.backgroundColor = color;
    this.plots.forEach((p) => p.redraw());
  }

  getBackgroundColor(): string {
    return this.backgroundColor;
  }

  #updateData(plot: uPlot, values: (number | null)[][]) {
    let data = [this.result.timestamps];
    for (const element of values) {
      data.push(element ?? this.#createNullArray());
    }
    plot.setData(data);
  }

  #createNullArray() {
    let nulls: number | null[] = [];
    this.result.timestamps.forEach(() => nulls.push(null));
    return nulls;
  }

  async createPlots() {
    this.resizeObserver.unobserve(this);
    const style = document.createElement("style");
    style.textContent = css;
    const plot_TA_TD_TSS = document.createElement("div");
    const plot_VW_VWG_DW = document.createElement("div");
    const plot_HS_PSUM = document.createElement("div");
    const plot_RH_GR = document.createElement("div");
    this.replaceChildren(style, plot_TA_TD_TSS, plot_VW_VWG_DW, plot_HS_PSUM, plot_RH_GR);

    if (this.result.values.TA) {
      const TD =
        this.result.values.TD ??
        (this.result.values.TA && this.result.values.RH
          ? this.result.values.TA.map((temp, i) => dewPoint(temp, this.result.values.RH[i]))
          : undefined);
      const p = new uPlot(
        {
          ...opts_TA_TD_TSS,
          ...(this.showTitle && !this.drawedTitle
            ? {
              title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
            }
            : {}),
        },
        [this.result.timestamps],
        plot_TA_TD_TSS,
      );
      this.drawedTitle = this.showTitle && !this.drawedTitle;

      this.#modifyDrawHook(p);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:temperature"));
      this.addSeries(p, opts_TA, this.result.values.TA);
      this.addSeries(p, opts_TD, TD);

      // show snow surface temperature and therefore surface hoar only if available
      if (this.result.values.TSS) {
        this.addSeries(p, opts_TSS, this.result.values.TSS);
        if (this.showSurfaceHoarSeries) {
          const surfacehoar = this.result.values.TD.map((td, i) => {
            const tss = this.result.values.TSS[i];
            return td < 0 && tss < td ? 1000 : -100;
          });
          this.addSeries(p, opts_SurfaceHoar, surfacehoar);
        }
      } else {
        this.addSeries(p, opts_TSS, []);
      }
    }

    if (this.result.values.VW || this.result.values.VW_MAX || this.result.values.DW) {
      const p = new uPlot({
        ...opts_VW_VWG_DW,
        ...(this.showTitle && !this.drawedTitle
          ? {
            title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
          }
          : {})
      }, [this.result.timestamps], plot_VW_VWG_DW);
      this.drawedTitle = this.showTitle && !this.drawedTitle;
      this.#modifyDrawHook(p);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:wind"));
      this.addSeries(p, opts_VW, this.result.values.VW);
      this.addSeries(p, opts_VW_MAX, this.result.values.VW_MAX);
      this.addSeries(p, opts_DW, this.result.values.DW);
    }

    if (this.result.values.HS || this.result.values.PSUM) {
      const p = new uPlot({
        ...opts_HS_PSUM,
        ...(this.showTitle && !this.drawedTitle
          ? {
            title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
          }
          : {})
      }, [this.result.timestamps], plot_HS_PSUM);
      this.drawedTitle = this.showTitle && !this.drawedTitle;
      this.#modifyDrawHook(p);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:precipitation"));
      this.addSeries(p, opts_HS, this.result.values.HS);
      this.addSeries(p, opts_PSUM, this.result.values.PSUM);
    }

    if (this.result.values.RH || this.result.values.ISWR) {
      const p = new uPlot({
        ...opts_RH_GR,
        ...(this.showTitle && !this.drawedTitle
          ? {
            title: `${this.result.station} (${i18n.number(this.result.altitude, { maximumFractionDigits: 0 })}m)`,
          }
          : {})
      }, [this.result.timestamps], plot_RH_GR);
      this.drawedTitle = this.showTitle && !this.drawedTitle;
      this.#modifyDrawHook(p);
      this.plotnames.push(i18n.message("dialog:weather-station-diagram:plotnames:humidity_gr"));
      this.addSeries(p, opts_RH, this.result.values.RH);
      this.addSeries(p, opts_ISWR, this.result.values.ISWR);
    }

    this.resizePlots(this.clientWidth, this.style);
    this.resizeObserver.observe(this);
  }

  disconnectedCallback() {
    this.resizeObserver.unobserve(this);
  }

  #modifyDrawHook(p: uPlot) {
    p.hooks.draw = p.hooks.draw || [];
    p.hooks.draw.unshift((u) => {
      const { left, top, width, height } = u.bbox;
      const ctx = u.ctx;
      ctx.save();
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    });
  }
}

customElements.define("linea-chart", LineaChart);
