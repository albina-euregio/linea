import { i18n } from "../i18n";
import { MIN_VISIBLE_DATAPOINTS } from "../shared/touch-zoom.ts";

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
  range: (self, newMin, newMax) => {
    const xData = self.data[0] as number[];

    const startIdx = xData.findIndex((v) => v >= newMin);
    const endIdx = xData.findIndex((v) => v > newMax) - 1;

    if (startIdx === -1 || endIdx === -2) {
      return [newMin, newMax];
    }

    const visiblePoints = endIdx - startIdx + 1;

    if (visiblePoints >= MIN_VISIBLE_DATAPOINTS) {
      return [newMin, newMax];
    }

    const mid = (newMin + newMax) / 2;

    const midIdx = xData.findIndex((v) => v >= mid);

    const half = Math.floor(MIN_VISIBLE_DATAPOINTS / 2);

    const newStartIdx = Math.max(0, midIdx - half);
    const newEndIdx = Math.min(xData.length - 1, newStartIdx + MIN_VISIBLE_DATAPOINTS - 1);

    return [xData[newStartIdx], xData[newEndIdx]];
  },
};
