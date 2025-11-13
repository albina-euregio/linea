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

      add(startDate: Temporal.PlainDate, endDate: Temporal.PlainDate, date: Temporal.PlainDate, hs: number, psum: number, ta: number, td: number) {
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
          this.valuesTA.push(ta);
          this.valuesTD.push(td);
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
            this.dates.map((d) =>
                f(
                    ...(map.get(d.toPlainMonthDay().toString()) ?? [NaN])
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

      get TA(): Float32Array {
        return new Float32Array(this.valuesTA);
      }

      get TD(): Float32Array {
        return new Float32Array(this.valuesTD);
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
          const hs = values.HS[i];
          const ta = values.TA ? values.TA[i] : NaN;
          const td = values.TD ? values.TD[i] : NaN;
          const psum = values.PSUM ? values.PSUM[i] : NaN;

          const timestamp = timestamps[i] * 1000;
          const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
          const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
          yearData.add(startDate, endDate, date, hs, psum, ta, td);
        }
        return yearData;
      }
    }