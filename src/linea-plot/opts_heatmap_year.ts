import uPlot from "uplot";
import { i18n } from "../i18n";
import { LineaOptsHelper } from "./linea-opts-helper";
import { LineaChartParameter } from "./linea-chart-parameter";
import type { Unit } from "../data/units";

const DAY = 24 * 60 * 60 * 1000;

export interface Threshold {
  /** `[min, max)` of the class in the parameter's unit; `null` means unbounded */
  range: [number | null, number | null];
  color: string;
}

/**
 * The snow height colour classes, taken verbatim from the snow-height overlay
 * of the Tyrolean avalanche warning service.
 *
 * @see https://wiski.tirol.gv.at/lawine/zamg_meteo/overlays/snow-height/config.json
 */
export const HS_THRESHOLDS: Threshold[] = [
  { range: [null, 1], color: "#fffffe" },
  { range: [1, 10], color: "#ffffb3" },
  { range: [10, 25], color: "#b0ffbc" },
  { range: [25, 50], color: "#8cffff" },
  { range: [50, 100], color: "#03cdff" },
  { range: [100, 200], color: "#0481ff" },
  { range: [200, 300], color: "#035bbe" },
  { range: [300, 400], color: "#784bff" },
  { range: [400, null], color: "#cc0ce8" },
];

/**
 * The air temperature colour classes, taken verbatim from the temperature
 * overlay of the Tyrolean avalanche warning service.
 *
 * @see https://wiski.tirol.gv.at/lawine/zamg_meteo/overlays/temp/config.json
 */
export const TA_THRESHOLDS: Threshold[] = [
  { range: [null, -25], color: "#9f80ff" },
  { range: [-25, -20], color: "#784bff" },
  { range: [-20, -15], color: "#035bbe" },
  { range: [-15, -10], color: "#0481ff" },
  { range: [-10, -5], color: "#03cdff" },
  { range: [-5, 0], color: "#8cffff" },
  { range: [0, 5], color: "#b0ffbc" },
  { range: [5, 10], color: "#ffff67" },
  { range: [10, 15], color: "#ffbe82" },
  { range: [15, 20], color: "#ff9a35" },
  { range: [20, 25], color: "#ff5536" },
  { range: [25, 30], color: "#ff0505" },
  { range: [30, null], color: "#fa3796" },
];

/** The index of the colour class the given value falls into. */
function thresholdIndex(thresholds: Threshold[], value: number): number {
  const index = thresholds.findIndex(
    ({ range: [min, max] }) => (min == null || value >= min) && (max == null || value < max),
  );
  return index < 0 ? thresholds.length - 1 : index;
}

/**
 * Draws one filled tile per (calendar day, season) cell, coloured by the given
 * {@link Threshold}s. Cells without a measurement are left blank.
 *
 * The series data is a `mode: 2` facet triple `[xs, ys, values]` as built by
 * `SeasonHeatmapData`; the cells are ordered x-major, so the y bins
 * repeat once per x bin, which yields the bin quantities and sizes.
 *
 * @see https://leeoniya.github.io/uPlot/demos/latency-heatmap.html
 */
function heatmapPaths(thresholds: Threshold[]): uPlot.Series.PathBuilder {
  return (u, seriesIdx) => {
    uPlot.orient(
      u,
      seriesIdx,
      (
        _series,
        _dataX,
        _dataY,
        scaleX,
        scaleY,
        valToPosX,
        valToPosY,
        xOff,
        yOff,
        xDim,
        yDim,
        _moveTo,
        _lineTo,
        rect,
      ) => {
        const [xs, ys, values] = u.data[seriesIdx] as unknown as [
          number[],
          number[],
          (number | null)[],
        ];
        const len = xs?.length ?? 0;
        if (len === 0) return;

        const yBinQty = len - ys.lastIndexOf(ys[0]);
        const xBinQty = len / yBinQty;
        const yBinIncr = yBinQty > 1 ? ys[1] - ys[0] : 1;
        const xBinIncr = xBinQty > 1 ? xs[yBinQty] - xs[0] : DAY;

        // uniform tile sizes based on zoom level
        const xSize = valToPosX(xBinIncr, scaleX, xDim, xOff) - valToPosX(0, scaleX, xDim, xOff);
        const ySize = valToPosY(yBinIncr, scaleY, yDim, yOff) - valToPosY(0, scaleY, yDim, yOff);

        // pre-calculate the tile origins per x and per y bin
        const cxs = Array.from({ length: xBinQty }, (_v, i) =>
          Math.round(valToPosX(xs[i * yBinQty], scaleX, xDim, xOff) - xSize / 2),
        );
        const cys = ys
          .slice(0, yBinQty)
          .map((y) => Math.round(valToPosY(y, scaleY, yDim, yOff) - ySize / 2));

        const paths = thresholds.map(() => new Path2D());
        for (let i = 0; i < len; i++) {
          const value = values[i];
          if (value == null) continue;
          // filter out cells which are out of view
          if (
            xs[i] < scaleX.min ||
            xs[i] > scaleX.max ||
            ys[i] < scaleY.min ||
            ys[i] > scaleY.max
          ) {
            continue;
          }
          const path = paths[thresholdIndex(thresholds, value)];
          rect(path, cxs[~~(i / yBinQty)], cys[i % yBinQty], xSize, ySize);
        }

        const ctx = u.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
        ctx.clip();
        paths.forEach((path, i) => {
          ctx.fillStyle = thresholds[i].color;
          ctx.fill(path);
        });
        ctx.restore();
      },
    );
    return null;
  };
}

/** Formats a season start year as e.g. `2023/24`. */
function formatSeason(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, "0")}`;
}

/**
 * Resolves the heatmap cell below the cursor. In `mode: 2` uPlot does not
 * resolve a data index by itself, so the cell is looked up from the cursor
 * position: the season by rounding to the nearest row, the calendar day by
 * bisecting the columns.
 */
function heatmapDataIdx(u: uPlot, seriesIdx: number): number | null {
  if (seriesIdx === 0) return null;
  const { left, top } = u.cursor;
  if (left == null || top == null || left < 0 || top < 0) return null;

  const [xs, ys] = u.data[seriesIdx] as unknown as [number[], number[]];
  const len = xs?.length ?? 0;
  if (len === 0) return null;

  const yBinQty = len - ys.lastIndexOf(ys[0]);
  const row = Math.round(u.posToVal(top, "y")) - ys[0];
  if (row < 0 || row >= yBinQty) return null;

  const xVal = u.posToVal(left, "x");
  let lo = 0;
  let hi = len / yBinQty - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid * yBinQty] < xVal) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(xs[(lo - 1) * yBinQty] - xVal) < Math.abs(xs[lo * yBinQty] - xVal)) {
    lo -= 1;
  }
  return lo * yBinQty + row;
}

/**
 * Draws the colour scale into the top padding of the chart — right-aligned,
 * below the axis label, with as many class boundaries labelled as fit next to
 * each other.
 */
function drawColorScale(u: uPlot, thresholds: Threshold[], unit: string) {
  const ctx = u.ctx;
  // uPlot has set the axis font, which is already scaled by the device pixel ratio
  const fontSize = parseFloat(ctx.font) || 12;
  const boxHeight = Math.round(fontSize * 0.9);
  // the axis label occupies the first line of the top padding
  const boxTop = 5 + fontSize;
  const labelTop = boxTop + boxHeight + 2;

  ctx.save();

  const unitWidth = ctx.measureText(unit).width;
  const boxWidth = Math.min(fontSize * 2.6, (u.bbox.width - unitWidth) / thresholds.length);
  const scaleWidth = boxWidth * thresholds.length;
  const left = u.bbox.left + u.bbox.width - unitWidth - scaleWidth;

  thresholds.forEach(({ color }, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(left + i * boxWidth, boxTop, boxWidth, boxHeight);
  });
  ctx.strokeStyle = "#878787";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, boxTop, scaleWidth, boxHeight);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(unit, left + scaleWidth, boxTop + boxHeight / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let labelEnd = -Infinity;
  thresholds.forEach(({ range: [min] }, i) => {
    if (min == null) return;
    const label = i18n.number(min);
    const width = ctx.measureText(label).width;
    const center = left + i * boxWidth;
    if (center - width / 2 < labelEnd) return;
    ctx.fillText(label, center, labelTop);
    labelEnd = center + width / 2 + 4;
  });
  ctx.restore();
}

/** The seasons of the heatmap series, ascending. */
function seasonsOf(u: uPlot): number[] {
  const ys = (u.data?.[1] as unknown as number[][])?.[1] ?? [];
  return [...new Set(ys)].sort((a, b) => a - b);
}

/** One tick per season row, thinned out as far as the rows are narrow. */
const seasonSplits: uPlot.Axis["splits"] = (u) => {
  const seasons = seasonsOf(u);
  const rowHeight = u.bbox.height / (seasons.length || 1);
  const step = Math.max(1, Math.ceil((15 * uPlot.pxRatio) / rowHeight));
  return seasons.filter((_v, i) => i % step === 0);
};

/**
 * The x axis of the heatmap: the calendar days of the reference season. Only
 * the month is labelled, the reference year itself is meaningless.
 */
const seasonDayAxis: uPlot.Axis = {
  scale: "x",
  grid: { show: false },
  splits: (_u, _axisIdx, scaleMin, scaleMax) => {
    const splits: number[] = [];
    const date = new Date(scaleMin);
    date.setHours(0, 0, 0, 0);
    date.setDate(1);
    while (+date <= scaleMax) {
      if (+date >= scaleMin) splits.push(+date);
      date.setMonth(date.getMonth() + 1);
    }
    return splits;
  },
  values: (_u, splits) => splits.map((s) => i18n.time(s, { month: "short" })),
};

/** The quantity a heatmap maps onto its tile colours. */
export interface HeatmapParameter {
  /** the localised parameter name, used as axis label and as legend column */
  name: string;
  /** the unit of the values, appended to the colour scale and the legend */
  unit: Unit;
  /** the colour of the axis label and ticks, matching the line chart of the parameter */
  color: string;
  /** the colour classes the values are mapped to */
  thresholds: Threshold[];
}

/**
 * Builds the uPlot options for a heatmap of the given parameter: calendar days
 * (October 1st to July 1st) on the x axis, seasons on the y axis, the value as
 * tile colour.
 *
 * A season spans two calendar years, so the rows are labelled with the season
 * itself, e.g. `2023/24`, on both the left and the right axis.
 */
export function heatmapOptions({ name, unit, color, thresholds }: HeatmapParameter): uPlot.Options {
  const parameter = new LineaChartParameter({
    label: `${name} (${unit})`,
    labelColor: color,
    scale: { range: (_u, dataMin, dataMax) => [dataMin - 0.5, dataMax + 0.5] },
    axis: {
      scale: "y",
      stroke: color,
      grid: { show: false },
      ticks: { show: false },
      splits: seasonSplits,
      values: (_u, splits) => splits.map(formatSeason),
    },
  });

  /** The right y axis: the calendar year each season ends in. */
  const seasonEndAxis: uPlot.Axis = {
    ...parameter.axis,
    side: 1,
    values: (_u, splits) => splits.map(formatSeason),
  };

  return {
    mode: 2,
    ms: 1,
    width: 1040,
    height: 200,
    // unlike the line charts the season axes are sized to their labels, so the
    // left padding must not eat into them
    padding: [46, 3, 0, 3],
    cursor: {
      // the crosshair ties the hovered cell back to the calendar day and the season
      x: true,
      y: true,
      points: { show: false },
      // the heatmap always shows the whole season and all years, so it is not zoomable
      drag: { setScale: false, x: false, y: false },
      dataIdx: heatmapDataIdx,
    },
    legend: { show: true, live: true, markers: { show: false } },
    hooks: {
      drawAxes: [
        (u) => {
          LineaOptsHelper.UpdateAxisLabelsForParameters(u, parameter);
          drawColorScale(u, thresholds, ` ${unit}`);
        },
      ],
    },

    scales: {
      x: {
        time: true,
        // half a day of padding so that the outermost tiles are fully visible
        range: (_u, dataMin, dataMax) => [dataMin - DAY / 2, dataMax + DAY / 2],
      },
      [parameter.axis.scale]: parameter.scale!,
    },

    axes: [seasonDayAxis, parameter.axis, seasonEndAxis],

    series: [
      {},
      {
        label: name,
        stroke: color,
        paths: heatmapPaths(thresholds),
        // a multi-value legend: one column per dimension of the hovered cell
        values: (u, seriesIdx, idx) => {
          const [xs, ys, values] = (u.data?.[seriesIdx] ?? []) as unknown as [
            number[],
            number[],
            (number | null)[],
          ];
          const day = xs?.[idx];
          const season = ys?.[idx];
          return {
            [i18n.message("linea:heatmap:day")]:
              day == null ? "–" : i18n.time(day, { day: "numeric", month: "short" }),
            [i18n.message("linea:heatmap:season")]: season == null ? "–" : formatSeason(season),
            [name]: i18n.number(values?.[idx], {}, unit),
          };
        },
        facets: [
          { scale: "x", auto: true, sorted: 1 },
          { scale: "y", auto: true },
        ],
      },
    ],
  };
}

/** uPlot options for the snow-height heatmap. */
export const opts_HS_heatmap_year = heatmapOptions({
  name: i18n.message("linea:parameter:HS"),
  unit: "cm",
  color: "#08519C",
  thresholds: HS_THRESHOLDS,
});

/** uPlot options for the air-temperature heatmap. */
export const opts_TA_heatmap_year = heatmapOptions({
  name: i18n.message("linea:parameter:TA"),
  unit: "℃",
  color: "#DE2D26",
  thresholds: TA_THRESHOLDS,
});
