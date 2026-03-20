import uPlot from "uplot";
import { i18n } from "../i18n";

const ms = 1,
  s = ms * 1e3,
  m = s * 60,
  h = m * 60,
  d = h * 24,
  y = d * 365;

export const timeAxis: uPlot.Axis = {
  values(_self, splits, _axisIdx, _foundSpace, foundIncr) {
    let opts:
      | [Intl.DateTimeFormatOptions]
      | [Intl.DateTimeFormatOptions, Intl.DateTimeFormatOptions] = [{}];
    if (foundIncr >= y) {
      opts = [{ year: "numeric" }];
    } else if (foundIncr >= 28 * d) {
      opts = [{ month: "short" }, { year: "numeric" }];
    } else if (foundIncr >= d) {
      opts = [{ month: "short", day: "numeric" }, { year: "numeric" }];
    } else {
      opts = [
        { hour: "2-digit", minute: "2-digit" },
        { month: "short", day: "2-digit" },
      ];
    }
    return splits.map((s) =>
      opts.map((o) => i18n.time(s % 100_000 === 99_999 ? s + 1 : s, o)).join("\n"),
    );
  },
  grid: {
    show: false,
  },
};

export const timeScale: uPlot.Scale = {
  time: true,
};
