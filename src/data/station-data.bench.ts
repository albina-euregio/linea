/**
 * Benchmarks the data pipeline of `<linea-plot>` when loading the weekly SMET
 * (`src`) and additionally merging the winter SMET (`lazysrc`) into it.
 *
 * Run with: `vp test bench station-data --reporter verbose`
 * Override the station with `LINEA_BENCH_STATION=GGAL2`.
 */
import "temporal-polyfill/global";
import { test } from "vite-plus/test";
import { fetchSMET } from "./smet-data";
import { StationData, StationDataArray } from "./station-data";

const station = process.env.LINEA_BENCH_STATION || "GGAL2";
const urls = {
  src: `https://wiski.tirol.gv.at/lawine/grafiken/smet/woche/${station}.smet.gz`,
  lazysrc: `https://wiski.tirol.gv.at/lawine/grafiken/smet/winter/${station}.smet.gz`,
};

// download once, so that the benchmarks measure decompression + parsing only
const bytes = Object.fromEntries(
  await Promise.all(
    Object.entries(urls).map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
      return [key, new Uint8Array(await response.arrayBuffer())] as const;
    }),
  ),
) as Record<keyof typeof urls, Uint8Array<ArrayBuffer>>;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string) => {
  const key = (Object.keys(urls) as (keyof typeof urls)[]).find((k) => urls[k] === url);
  if (!key) return realFetch(url);
  return new Response(bytes[key], { headers: { "Content-Type": "application/gzip" } });
}) as typeof fetch;

const week = await fetchSMET(urls.src);
const winter = await fetchSMET(urls.lazysrc);
console.info(
  `${station}: src ${bytes.src.length} B gz, ${week.timestamps.length} rows; ` +
    `lazysrc ${bytes.lazysrc.length} B gz, ${winter.timestamps.length} rows`,
);

function clone(d: StationData): StationData {
  return new StationData(
    d.station,
    d.altitude,
    d.timestamps.slice(),
    { ...d.units },
    Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, v?.slice()])),
  );
}

function loadSrc(): StationDataArray {
  const results = new StationDataArray();
  results.mergeWith(new StationDataArray(clone(week)));
  return results;
}

function mergeLazySrc(results: StationDataArray): StationDataArray {
  results.mergeWith(new StationDataArray(clone(winter)));
  return results;
}

const merged = mergeLazySrc(loadSrc());
const end = Temporal.Instant.fromEpochMilliseconds(merged.minMaxTime[1]).toZonedDateTimeISO("UTC");

test("parse", async ({ bench }) => {
  await bench.compare(
    bench("fetchSMET src (woche)", () => fetchSMET(urls.src).then(() => {})),
    bench("fetchSMET lazysrc (winter)", () => fetchSMET(urls.lazysrc).then(() => {})),
  );
});

test("merge lazysrc into src", async ({ bench }) => {
  await bench.compare(
    bench("loadSrc (baseline: mergeWith woche)", () => {
      loadSrc();
    }),
    bench("loadSrc + mergeWith lazysrc", () => {
      mergeLazySrc(loadSrc());
    }),
  );
});

test("filter merged data", async ({ bench }) => {
  await bench.compare(
    ...[7, 28, 365].map((days) =>
      bench(`filter ${days} days`, () => {
        merged[0].filter(end.subtract({ days }), end);
      }),
    ),
  );
});

test("derived series on merged data", async ({ bench }) => {
  await bench.compare(
    bench("clone (baseline)", () => {
      clone(merged[0]);
    }),
    bench("clone + generateSurfaceHoarData", () => {
      clone(merged[0]).generateSurfaceHoarData();
    }),
    bench("clone + generateDrySnowfallLevelData", () => {
      clone(merged[0]).generateDrySnowfallLevelData();
    }),
  );
});
