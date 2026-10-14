/**
 * Experimental WebAssembly implementation of the hot loops of SMET parsing and
 * timestamp merging, see `wasm/smet/src/lib.rs`. Build with `pnpm run build:wasm`.
 *
 * Opt-in via the URL parameter `?linea-wasm` (or `LINEA_WASM=1` in Node).
 */
export const WASM_ENABLED: boolean =
  (typeof location !== "undefined" && new URLSearchParams(location.search).has("linea-wasm")) ||
  (typeof process !== "undefined" && process.env?.LINEA_WASM === "1");

type Ptr = number;
interface SmetExports {
  memory: WebAssembly.Memory;
  alloc(len: number): Ptr;
  dealloc(ptr: Ptr, len: number): void;
  data_offset(ptr: Ptr, len: number): number;
  parse_data(
    ptr: Ptr,
    len: number,
    ncols: number,
    tzMinutes: number,
    nodataPtr: Ptr,
    nodataLen: number,
  ): Ptr;
  parsed_rows(parsed: Ptr): number;
  parsed_timestamps(parsed: Ptr): Ptr;
  parsed_column(parsed: Ptr, i: number): Ptr;
  parsed_missing(parsed: Ptr, i: number): Ptr;
  parsed_free(parsed: Ptr): void;
  union_timestamps(ptr: Ptr, lensPtr: Ptr, n: number): Ptr;
  union_len(union: Ptr): number;
  union_timestamps_ptr(union: Ptr): Ptr;
  union_indices(union: Ptr, k: number): Ptr;
  union_free(union: Ptr): void;
}

let wasm: SmetExports | undefined;
let wasm$: Promise<SmetExports> | undefined;

export function loadSmetWasm(): Promise<SmetExports> {
  wasm$ ??= (async () => {
    const url = new URL("./smet.wasm", import.meta.url);
    const fs = "node:fs/promises";
    const source =
      url.protocol === "file:"
        ? await (await import(/* @vite-ignore */ fs)).readFile(url)
        : await (await fetch(url)).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(source);
    return (wasm = instance.exports as unknown as SmetExports);
  })();
  return wasm$;
}

/**
 * Copies `bytes` into the module memory and passes the pointer to `fn`.
 */
function withBytes<T>(w: SmetExports, bytes: Uint8Array, fn: (ptr: Ptr) => T): T {
  const ptr = w.alloc(bytes.length);
  new Uint8Array(w.memory.buffer, ptr, bytes.length).set(bytes);
  try {
    return fn(ptr);
  } finally {
    w.dealloc(ptr, bytes.length);
  }
}

/**
 * Parses the SMET data lines into timestamps and unit-converted columns,
 * the header is parsed by the caller (see {@link headerLength}).
 */
export async function parseSMETData(
  bytes: Uint8Array,
  ncols: number,
  tzMinutes: number,
  nodata: string,
  converters: ((v: number) => number)[],
): Promise<{ timestamps: number[]; columns: (number | null)[][] }> {
  const w = await loadSmetWasm();
  const nodataBytes = new TextEncoder().encode(nodata);
  const parsed = withBytes(w, bytes, (ptr) =>
    withBytes(w, nodataBytes, (nodataPtr) =>
      w.parse_data(ptr, bytes.length, ncols, tzMinutes, nodataPtr, nodataBytes.length),
    ),
  );
  try {
    const rows = w.parsed_rows(parsed);
    const timestamps = Array.from(
      new Float64Array(w.memory.buffer, w.parsed_timestamps(parsed), rows),
    );
    const columns = Array.from({ length: ncols }, (_, i): (number | null)[] => {
      if (i === 0) return []; // timestamp
      const values = new Float64Array(w.memory.buffer, w.parsed_column(parsed, i), rows);
      const missing = new Uint8Array(w.memory.buffer, w.parsed_missing(parsed, i), rows);
      const convert = converters[i];
      return Array.from(values, (v, j) => (missing[j] ? null : convert(v)));
    });
    return { timestamps, columns };
  } finally {
    w.parsed_free(parsed);
  }
}

/**
 * Returns the byte length of the SMET header, i.e. the offset of the first data line.
 */
export async function headerLength(bytes: Uint8Array): Promise<number> {
  const w = await loadSmetWasm();
  return withBytes(w, bytes, (ptr) => w.data_offset(ptr, bytes.length));
}

/**
 * WebAssembly implementation of aligning timestamp arrays to their sorted union,
 * available once the module has been loaded (see {@link loadSmetWasm}).
 */
export function alignTimestampsWasm(
  inputs: number[][],
): { timestamps: number[]; indices: Int32Array[] } | undefined {
  if (!WASM_ENABLED || !wasm) return undefined;
  const w = wasm;
  const all = new Float64Array(inputs.flat());
  const lens = new Uint32Array(inputs.map((ts) => ts.length));
  const union = withBytes(w, new Uint8Array(all.buffer), (ptr) =>
    withBytes(w, new Uint8Array(lens.buffer), (lensPtr) =>
      w.union_timestamps(ptr, lensPtr, inputs.length),
    ),
  );
  try {
    const len = w.union_len(union);
    return {
      timestamps: Array.from(new Float64Array(w.memory.buffer, w.union_timestamps_ptr(union), len)),
      indices: inputs.map((_, k) =>
        new Int32Array(w.memory.buffer, w.union_indices(union, k), len).slice(),
      ),
    };
  } finally {
    w.union_free(union);
  }
}
