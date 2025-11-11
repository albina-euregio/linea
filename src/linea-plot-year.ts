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
} from "./linea-plot/opts_HS_year";
import { fetchSMET } from "./smet-data";
import { Temporal } from "temporal-polyfill";

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
    const style = document.createElement("style");
    style.textContent = css;
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
      valuesPSUM: number[] = [];

      add(date: Temporal.PlainDate, hs: number, psum: number) {
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
          this.valuesPSUM.push(psum);
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

      get PSUM(): Float32Array {
        return new Float32Array(this.valuesPSUM);
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

      static from(timestamps: Uint32Array, HS: Float32Array, PSUM: Float32Array): YearData {
        const yearData = new YearData();
        for (let i = 0; i < timestamps.length; i++) {
          const hs = HS[i];
          let psum = 0;
          if(PSUM){
            psum = PSUM[i];
          }
          

          //can lead to problem if only one is not finite, because both will no be parsed
          //shouldn't be so often
          if (!isFinite(hs) && !isFinite(psum)) {
            continue;
          }

          const timestamp = timestamps[i] * 1000;
          const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
          const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
          yearData.add(date, hs, psum);
        }
        return yearData;
      }
    }
    
    const yearData = YearData.from(timestamps, values.HS, values.PSUM);
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
    let test = new Float32Array([
        0, 0, 17.85, 5.6299, 0, 0, 0, 0.2569, 0, 0, 3.2709, 0.0694, 0, 0.5138,
        1.8403, 0.0972, 1.9931, 0, 0.9861, 2.5375, 3.375, 0, 0, 0, 0, 0, 0,
        2.3056, 0.8056, 0, 0, 0.4097, 0, 2.6111, 5.4584, 2.4826, 0, 1.7709,
        3.2569, 3.2986, 2.0972, 1.125, 1.4444, 0, 0, 0.85, 5.6299, 0, 0, 0,
        0.2569, 0, 0, 3.2709, 0.0694, 0, 0.5138, 1.8403, 0.0972, 1.9931, 0,
        0.9861, 2.5375, 3.375, 0, 0, 0, 0, 0, 0, 2.3056, 0.8056, 0, 0, 0.4097,
        0, 2.6111, 5.4584, 2.4826, 0, 1.7709, 3.2569, 3.2986, 2.0972, 1.125,
        1.4444, 0, 0, 0.85, 5.6299, 0, 0, 0, 0.2569, 0, 0, 3.2709, 0.0694, 0,
        0.5138, 1.8403, 0.0972, 1.9931, 0, 0.9861, 2.5375, 3.375, 0, 0, 0, 0,
        0, 0, 2.3056, 0.8056, 0, 0, 0.4097, 0, 2.6111, 5.4584, 2.4826, 0,
        1.7709, 3.2569, 3.2986, 2.0972, 1.125, 1.4444, 0, 0, 0, 0, 0, 3, 4,
      ]);
    this.#addSeries(p, opts_HS_year_min, yearData.HS_min);
    this.#addSeries(p, opts_HS_year_max, yearData.HS_max);
    this.#addSeries(p, opts_HS_year_median, yearData.HS_median);
    this.#addSeries(p, opts_HS_year_current, yearData.HS);
    if(values.PSUM){
      this.#addSeries(p, opts_HS_year_PSUM, yearData.PSUM);
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

customElements.define("linea-plot-year", LineaPlotYear);
