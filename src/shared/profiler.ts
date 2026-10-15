import type uPlot from "uplot";

/**
 * Lightweight opt-in profiler based on the User Timing API.
 *
 * Enable with the URL parameter `?linea-profile` or `localStorage.setItem("linea:profile", "1")`.
 * Measures show up in the DevTools Performance panel (Timings track) and are
 * summarized via `console.table` by calling `lineaProfile()` in the console.
 */
export const PROFILING_ENABLED: boolean = (() => {
  try {
    return (
      new URLSearchParams(globalThis.location?.search).has("linea-profile") ||
      globalThis.localStorage?.getItem("linea:profile") === "1"
    );
  } catch {
    return false;
  }
})();

const PREFIX = "linea:";
let counter = 0;

function start(name: string): string {
  const mark = `${PREFIX}${name}#${counter++}`;
  performance.mark(mark);
  return mark;
}

function end(name: string, mark: string, detail?: unknown): void {
  performance.measure(PREFIX + name, { start: mark, detail });
  performance.clearMarks(mark);
}

/**
 * Measures the synchronous execution of `fn`.
 */
export function profile<T>(name: string, fn: () => T, detail?: unknown): T {
  if (!PROFILING_ENABLED) return fn();
  const mark = start(name);
  try {
    return fn();
  } finally {
    end(name, mark, detail);
  }
}

/**
 * Measures the time until the promise returned by `fn` settles.
 */
export async function profileAsync<T>(
  name: string,
  fn: () => Promise<T>,
  detail?: unknown,
): Promise<T> {
  if (!PROFILING_ENABLED) return fn();
  const mark = start(name);
  try {
    return await fn();
  } finally {
    end(name, mark, detail);
  }
}

/**
 * Measures from now until the browser has painted the next frame,
 * i.e. including deferred uPlot redraws, style, layout and paint.
 */
export function profileUntilPaint(name: string, detail?: unknown): void {
  if (!PROFILING_ENABLED) return;
  const mark = start(name);
  requestAnimationFrame(() => setTimeout(() => end(name, mark, detail)));
}

/**
 * uPlot plugin measuring each (re)draw of a plot, from `drawClear` until `draw`.
 */
export function profilerPlugin(name: string): uPlot.Plugin {
  if (!PROFILING_ENABLED) return { hooks: {} };
  const marks = new WeakMap<uPlot, string>();
  return {
    hooks: {
      drawClear: (u) => {
        marks.set(u, start(`render:${name}`));
      },
      draw: (u) => {
        const mark = marks.get(u);
        if (!mark) return;
        marks.delete(u);
        end(`render:${name}`, mark, { points: u.data[0]?.length, series: u.series.length });
      },
    },
  };
}

/**
 * Aggregates all recorded measures by name.
 */
export function profileSummary() {
  const rows = new Map<string, { count: number; total: number; max: number }>();
  for (const entry of performance.getEntriesByType("measure")) {
    if (!entry.name.startsWith(PREFIX)) continue;
    const name = entry.name.slice(PREFIX.length);
    const row = rows.get(name) ?? { count: 0, total: 0, max: 0 };
    row.count++;
    row.total += entry.duration;
    row.max = Math.max(row.max, entry.duration);
    rows.set(name, row);
  }
  return Object.fromEntries(
    [...rows].map(([name, { count, total, max }]) => [
      name,
      {
        count,
        "total [ms]": +total.toFixed(1),
        "avg [ms]": +(total / count).toFixed(1),
        "max [ms]": +max.toFixed(1),
      },
    ]),
  );
}

if (PROFILING_ENABLED) {
  Object.assign(globalThis, {
    lineaProfile(clear = false) {
      console.table(profileSummary());
      if (clear) performance.clearMeasures();
    },
  });
  console.info("linea profiling enabled, call lineaProfile() for a summary");
}
