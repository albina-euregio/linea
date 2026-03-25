import uPlot from "uplot";

export type StackedData = Array<Array<number | null>>;

export type Stack2Series = {
  values: Array<number | null>;
  negY?: boolean;
  stacking: {
    mode: string;
    group?: string;
  };
  scaleKey?: string;
};

export function stack(
  data: StackedData,
  omit: (seriesIdx: number) => boolean,
): { data: StackedData; bands: uPlot.Band[] } {
  const data2: Array<Array<number | null>> = [];
  let bands: uPlot.Band[] = [];
  const d0Len = data[0].length;
  const accum: number[] = Array(d0Len).fill(0);

  for (let i = 1; i < data.length; i++) {
    data2.push(omit(i) ? data[i] : data[i].map((v, j) => (accum[j] += +(v ?? 0))));
  }

  for (let i = 1; i < data.length; i++) {
    if (!omit(i)) {
      bands.push({
        series: [data.findIndex((_s, j) => j > i && !omit(j)), i],
      });
    }
  }

  bands = bands.filter((b) => b.series[1] > -1);

  return {
    data: [data[0]].concat(data2),
    bands,
  };
}

export function getStackedOpts(
  opts: uPlot.Options,
  _series: uPlot.Series[],
  data: StackedData,
  interp?: (input: StackedData) => StackedData,
  formatValue?: (value: number | null) => string | number,
): { opts: uPlot.Options; data: StackedData } {
  const interped = interp ? interp(data) : data;

  const stacked = stack(interped, (_i: number) => false);
  opts.bands = stacked.bands;

  opts.cursor = opts.cursor || {};
  opts.cursor.dataIdx = (
    _u: uPlot,
    seriesIdx: number,
    closestIdx: number,
    _xValue: number | null,
  ) => {
    return data[seriesIdx][closestIdx] == null ? null : closestIdx;
  };

  opts.series.forEach((s: uPlot.Series, index: number) => {
    if (index === 0) {
      return;
    }

    s.value = (_u: uPlot, _v: number, si: number, i: number | null) => {
      if (i === null) {
        return "-";
      }
      const value = data[si]?.[i] ?? null;
      if (!formatValue) {
        return value == null || Number.isNaN(value) ? "-" : value;
      }
      return formatValue(value);
    };

    s.points = s.points || {};
    s.points.filter = (_u: uPlot, seriesIdx: number, show: boolean, _gaps?: number[][] | null) => {
      if (!show) {
        return null;
      }
      const pts: number[] = [];
      data[seriesIdx].forEach((v: number | null, i: number) => {
        if (v != null) {
          pts.push(i);
        }
      });
      return pts;
    };
  });

  opts.scales = opts.scales || {};
  opts.scales.y = {
    range: (_u: uPlot, _min: number, max: number) => {
      const minMax = uPlot.rangeNum(0, max, 0.1, true);
      return [0, minMax[1]];
    },
  };

  const existingHooks = opts.hooks || {};
  const existingSetSeries = existingHooks.setSeries || [];
  opts.hooks = {
    ...existingHooks,
    setSeries: [
      ...existingSetSeries,
      (u: uPlot, _seriesIdx: number | null, _opts: uPlot.Series) => {
        const restacked = stack(data, (seriesIdx: number) => !u.series[seriesIdx].show);
        u.delBand(null);
        restacked.bands.forEach((b: uPlot.Band) => u.addBand(b));
        u.setData(restacked.data as unknown as uPlot.AlignedData);
      },
    ],
  };

  return { opts, data: stacked.data };
}

export function stack2(series: Stack2Series[]): {
  data: Array<Array<number | null> | undefined>;
  bands: Array<{ series: [number, number]; dir: number }>;
} {
  const data: Array<Array<number | null> | undefined> = Array(series.length);
  const bands: Array<{ series: [number, number]; dir: number }> = [];

  const dataLen = series[0].values.length;
  const zeroArr = Array(dataLen).fill(0);

  const stackGroups = new Map<string, { series: number[]; acc: number[]; dir: number }>();
  const seriesStackKeys: string[] = Array(series.length);

  series.forEach((s, si) => {
    const vals = s.values.slice();

    if (s.negY) {
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] != null) {
          vals[i] = vals[i]! * -1;
        }
      }
    }

    if (s.stacking.mode !== "none") {
      const hasPos = vals.some((v) => (v ?? 0) > 0);
      const stackKey = (seriesStackKeys[si] =
        s.stacking.mode + s.scaleKey + s.stacking.group + (hasPos ? "+" : "-"));
      let group = stackGroups.get(stackKey);

      if (group == null) {
        group = {
          series: [],
          acc: zeroArr.slice(),
          dir: hasPos ? -1 : 1,
        };
        stackGroups.set(stackKey, group);
      }

      group.series.unshift(si);

      const stacked = (data[si] = Array(dataLen));
      const { acc } = group;

      for (let i = 0; i < dataLen; i++) {
        const v = vals[i];
        if (v != null) {
          stacked[i] = acc[i] += v;
        } else {
          stacked[i] = v;
        }
      }
    } else {
      data[si] = vals;
    }
  });

  series.forEach((s, si) => {
    if (s.stacking.mode === "percent") {
      const group = stackGroups.get(seriesStackKeys[si]);
      if (!group) {
        return;
      }
      const { acc } = group;
      const sign = group.dir * -1;
      const stacked = data[si];
      if (!stacked) {
        return;
      }

      for (let i = 0; i < dataLen; i++) {
        const v = stacked[i];
        if (v != null) {
          stacked[i] = sign * (v / acc[i]);
        }
      }
    }
  });

  stackGroups.forEach((group) => {
    const { series: groupSeries, dir } = group;
    const lastIdx = groupSeries.length - 1;

    groupSeries.forEach((si, i) => {
      if (i !== lastIdx) {
        const nextIdx = groupSeries[i + 1];
        bands.push({
          series: [si + 1, nextIdx + 1],
          dir,
        });
      }
    });
  });

  return {
    data,
    bands,
  };
}
