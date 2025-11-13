import { Temporal } from "temporal-polyfill";
import { Values } from "../smet-data";

export class YearData {
      plainMonthData = new Map<
        ReturnType<Temporal.PlainMonthDay["toString"]>,
        number[]
      >();
      dates: Temporal.PlainDate[] = [];
      valuesHS: number[] = [];
      valuesPSUM: number[] = [];
      timeZone: string = "";

      add(startDate: Temporal.PlainDate, endDate: Temporal.PlainDate, date: Temporal.PlainDate, hs: number, psum: number) {
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
        const timeZone = this.timeZone;
        return new Uint32Array(
          this.dates.map(
            (d) =>
              d.toZonedDateTime({ plainTime: "00:00:00", timeZone})
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

      static from(timeZone: string, startDate: Temporal.PlainDate, endDate: Temporal.PlainDate, timestamps: Uint32Array, values: Values): YearData {
        const yearData = new YearData();
        yearData.timeZone = timeZone;
        for (let i = 0; i < timestamps.length; i++) {
          const hs = values.HS[i];
          let psum = 0;
          if(values.PSUM){
            psum = values.PSUM[i];
          }
          

          //can lead to problem if only one is not finite, because both will no be parsed
          //shouldn't be so often
          if (!isFinite(hs)) {
            continue;
          }

          const timestamp = timestamps[i] * 1000;
          const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
          const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
          yearData.add(startDate, endDate, date, hs, psum);
        }
        return yearData;
      }
    }