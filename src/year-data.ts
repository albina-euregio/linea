if (!globalThis.Temporal) {
  import("temporal-polyfill/global");
}

export class YearData {
  monthDayData = new Map<ReturnType<Temporal.PlainMonthDay["toString"]>, number[]>();
  dates: Temporal.PlainDate[] = [];
  values: number[] = [];
  timeZone: string = "";

  get timestamps(): Uint32Array {
    const timeZone = this.timeZone;
    return new Uint32Array(
      this.dates.map(
        (d) => d.toZonedDateTime({ plainTime: "00:00:00", timeZone }).epochMilliseconds / 1000,
      ),
    );
  }

  #aggFor(
    map: Map<ReturnType<Temporal.PlainMonthDay["toString"]>, number[]>,
    f: (...values: number[]) => number,
  ): number[] {
    return this.dates.map((d) => {
      let monthDay = d.toPlainMonthDay().toString();
      if (d.inLeapYear && monthDay === "02-29") {
        // use 02-28 for 02-29 to avoid artifacts
        monthDay = d.subtract({ days: 1 }).toPlainMonthDay().toString();
      }
      const arr = map.get(monthDay) ?? [];
      const finite = arr.filter(Number.isFinite);
      if (finite.length === 0) return NaN;
      return f(...finite);
    });
  }

  get amount(): number[] {
    return this.#aggFor(this.monthDayData, (...v) => v.filter(Number.isFinite).length);
  }

  get maxValues(): number[] {
    return this.#aggFor(this.monthDayData, Math.max);
  }

  get minValues(): number[] {
    return this.#aggFor(this.monthDayData, Math.min);
  }

  get medianValues(): number[] {
    return this.#aggFor(
      this.monthDayData,
      (...v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)],
    );
  }

  static from(
    timeZone: string,
    startDate: Temporal.PlainDate,
    endDate: Temporal.PlainDate,
    timestamps: Uint32Array,
    values: number[],
  ): YearData {
    const yearData = new YearData();
    yearData.timeZone = timeZone;
    for (let i = 0; i < timestamps.length; i++) {
      const value = Number.isFinite(values[i]) ? values[i] : NaN;
      const timestamp = timestamps[i] * 1000;
      const instant = Temporal.Instant.fromEpochMilliseconds(timestamp);
      const date = instant.toZonedDateTimeISO(timeZone).toPlainDate();
      const monthDay = date.toPlainMonthDay().toString();

      if (!yearData.monthDayData.has(monthDay)) {
        yearData.monthDayData.set(monthDay, []);
      }
      yearData.monthDayData.get(monthDay)?.push(value);

      if (startDate.toString() <= date.toString() && date.toString() <= endDate.toString()) {
        yearData.dates.push(date);
        yearData.values.push(value);
      }
    }
    return yearData;
  }
}
