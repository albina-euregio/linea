import { Temporal } from "temporal-polyfill";
import { Values } from "../smet-data";

export class YearData {
      plainMonthData = new Map<
        ReturnType<Temporal.PlainMonthDay["toString"]>,
        number[]
      >();

      plainMonthTempData = new Map<
        ReturnType<Temporal.PlainMonthDay["toString"]>,
        number[]
     >();

      dates: Temporal.PlainDate[] = [];
      valuesHS: number[] = [];
      valuesPSUM: number[] = [];
      valuesTA: number[] = [];
      valuesTD: number[] = [];
      timeZone: string = "";
      valuesNS: number[] = [];

      add(startDate: Temporal.PlainDate, endDate: Temporal.PlainDate, date: Temporal.PlainDate, hs: number, psum: number, ta: number, td: number, ns: number = NaN) {
        const monthDay = date.toPlainMonthDay().toString();

        // sanitize inputs: undefined / non-finite -> NaN
        hs = Number.isFinite(hs) ? hs : NaN;
        ta = Number.isFinite(ta) ? ta : NaN;
        psum = Number.isFinite(psum) ? psum : NaN;
        td = Number.isFinite(td) ? td : NaN;
        ns = Number.isFinite(ns) ? ns : NaN;

        if (!this.plainMonthData.has(monthDay)) {
          this.plainMonthData.set(monthDay, []);
        }
        this.plainMonthData.get(monthDay)?.push(hs);
        if (!this.plainMonthTempData.has(monthDay)) {
          this.plainMonthTempData.set(monthDay, []);
        }
        this.plainMonthTempData.get(monthDay)?.push(ta);
        if (
          startDate.toString() <= date.toString() &&
          date.toString() <= endDate.toString()
        ) {
          this.dates.push(date);
          this.valuesHS.push(hs);
          this.valuesPSUM.push(psum);
          this.valuesTA.push(ta);
          this.valuesTD.push(td);
          this.valuesNS.push(ns);
        }
      }

      get timestamps(): Uint32Array {
        const timeZone = this.timeZone;
        return new Uint32Array(
          this.dates.map(
            (d) =>
              d.toZonedDateTime({ plainTime: "00:00:00", timeZone})
                .epochMilliseconds / 1000
          )
        );
      }

      #aggFor(map: Map<ReturnType<Temporal.PlainMonthDay["toString"]>, number[]>, f: (...values: number[]) => number): Float32Array {
        return new Float32Array(
            this.dates.map((d) => {
                const arr = map.get(d.toPlainMonthDay().toString()) ?? [];
                const finite = arr.filter(Number.isFinite);
                if (finite.length === 0) return NaN;
                return f(...finite);
            })
         );
      }

      get N(): Float32Array {
        return this.#aggFor(this.plainMonthData, (...v) => v.filter(Number.isFinite).length);
      }

      get PSUM(): Float32Array {
        return new Float32Array(this.valuesPSUM);
      }

      get HS(): Float32Array {
        return new Float32Array(this.valuesHS);
      }

      get TA(): Float32Array {
        return new Float32Array(this.valuesTA);
      }

      get TD(): Float32Array {
        return new Float32Array(this.valuesTD);
      }

      get NS(): Float32Array {
        return new Float32Array(this.valuesNS);
      }

      get HS_max(): Float32Array {
        return this.#aggFor(this.plainMonthData, Math.max);
      }

      get HS_min(): Float32Array {
        return this.#aggFor(this.plainMonthData, Math.min);
      }

      get HS_median(): Float32Array {
        return this.#aggFor(this.plainMonthData,
          (...v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]
        );
      }

      get TA_min(): Float32Array {
        return this.#aggFor(this.plainMonthTempData, Math.min);
      }

      get TA_max(): Float32Array {
        return this.#aggFor(this.plainMonthTempData, Math.max);
      }
      
      get TA_median(): Float32Array {
        return this.#aggFor(this.plainMonthTempData,
          (...v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)]
        );
      }


      static from(timeZone: string, startDate: Temporal.PlainDate, endDate: Temporal.PlainDate, timestamps: Uint32Array, values: Values): YearData {
        const yearData = new YearData();
        yearData.timeZone = timeZone;
        for (let i = 0; i < timestamps.length; i++) {
          const hs = values.HS[i] ? values.HS[i] : NaN;
          const ta = values.TA ? values.TA[i] : NaN;
          const td = values.TD ? values.TD[i] : NaN;
          const psum = values.PSUM ? values.PSUM[i] : NaN;
          const ns = values.NS ? values.NS[i] : NaN;

          const timestamp = timestamps[i] * 1000;
          const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
          const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
          yearData.add(startDate, endDate, date, hs, psum, ta, td, ns);
        }
        return yearData;
      }
    }