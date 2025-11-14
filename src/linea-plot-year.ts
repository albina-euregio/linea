import uPlot from "uplot";
import css from "uplot/dist/uPlot.min.css?raw";
import { i18n } from "./i18n";
import {
  opts_HS_current,
  opts_HS_max,
  opts_HS_median,
  opts_HS_min,
  opts_HS_year,
} from "./linea-plot/opts_HS_year";
import { fetchSMET } from "./smet-data";
import { Temporal } from "temporal-polyfill";
import { PlotHelper } from "./plot-helper";

/**
 * uPlot diagram for yearly overview of snow height.
 * 
 * Expect `src` to be a SMET file containing daily snow height data from the beginning of measurement.
 * Aggregate the data by each calendar day into min/median/max.
 * Render snow height between `startDate` and `endDate`.
 */
export class LineaPlotYear extends HTMLElement {
  static observedAttributes = ["src"];
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
      this.getAttribute("src") ?? "",
      Infinity
    );
    const plotHelper = new PlotHelper();
    const scale = plotHelper.GetScale(this.clientWidth);
    const style = document.createElement("style");
    style.textContent = css;
    /*    style.textContent = `
      .vw-max-plot .u-axis-label {
        transform: rotate(-90deg);
        transform-origin: left top;
        white-space: nowrap;
      }
    `;*/
    //document.head.appendChild(style);
    const plot_HS_year = document.createElement("div");
    this.replaceChildren(style, plot_HS_year);

    const startDate = Temporal.PlainDate.from(this.getAttribute("startDate")!);
    const endDate = Temporal.PlainDate.from(this.getAttribute("endDate")!);
    const timeZone = this.getAttribute("timeZone") || "CET";

    class YearData {
      plainMonthData = new Map<
        ReturnType<Temporal.PlainMonthDay["toString"]>,
        number[]
      >();
      dates: Temporal.PlainDate[] = [];
      valuesHS: number[] = [];

      add(date: Temporal.PlainDate, hs: number) {
        const monthDay = date.toPlainMonthDay().toString();
        if (!this.plainMonthData.has(monthDay)) {
          this.plainMonthData.set(monthDay, []);
        }
        this.plainMonthData.get(monthDay)?.push(hs);
        if (
          startDate.toString() <= date.toString() &&
          date.toString() <= endDate.toString()
        ) {
          this.dates.push(date);
          this.valuesHS.push(hs);
        }
      }

      get timestamps(): Uint32Array {
        return new Uint32Array(
          this.dates.map(
            (d) =>
              d.toZonedDateTime({ plainTime: "00:00:00", timeZone })
                .epochMilliseconds / 1000
          )
        );
      }

      #agg(f: (...values: number[]) => number): Float32Array {
        return new Float32Array(
          this.dates.map((d) =>
            f(
              ...(this.plainMonthData.get(d.toPlainMonthDay().toString()) ?? [
                NaN,
              ])
            )
          )
        );
      }

      get HS(): Float32Array {
        return new Float32Array(this.valuesHS);
      }

      get HS_max(): Float32Array {
        return this.#agg(Math.max);
      }

      get HS_min(): Float32Array {
        return this.#agg(Math.min);
      }

      get HS_median(): Float32Array {
        return this.#agg(
          (...v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]
        );
      }

      static from(timestamps: Uint32Array, HS: Float32Array): YearData {
        const yearData = new YearData();
        for (let i = 0; i < timestamps.length; i++) {
          const hs = HS[i];
          if (!isFinite(hs)) {
            continue;
          }

          const timestamp = timestamps[i] * 1000;
          const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
          const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
          yearData.add(date, hs);
        }
        return yearData;
      }
    }

    const yearData = YearData.from(timestamps, values.HS);
    const p = new uPlot(
      {
        ...opts_HS_year,      
        axes: plotHelper.makeAxes(scale),
        ...(this.hasAttribute("showTitle")
          ? {
              title: `${station} (${i18n.number(altitude, { maximumFractionDigits: 0 })}m)`,
            }
          : {}),
      },
      [yearData.timestamps],
      plot_HS_year
    );
    plotHelper.addSeries(this.#plots, p, opts_HS_min, yearData.HS_min);
    plotHelper.addSeries(this.#plots, p, opts_HS_max, yearData.HS_max);
    plotHelper.addSeries(this.#plots, p, opts_HS_median, yearData.HS_median);
    plotHelper.addSeries(this.#plots, p, opts_HS_current, yearData.HS);

    plotHelper.resizePlots(this.#plots, this.clientWidth, this.style, null);
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

customElements.define("linea-plot-year", LineaPlotYear);
