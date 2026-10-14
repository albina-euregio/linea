/**
 * WebAssembly implementation of the hot loops of SMET parsing and timestamp merging,
 * see `wasm/smet/src/lib.rs`. Build with `pnpm run build:wasm`.
 *
 * The module owns its input and result buffers: JavaScript writes into the buffer
 * returned by `input()` and reads the results of the last call via the getters.
 *
 * Used by default, with a fallback to the TypeScript implementation if the module cannot be loaded.
 * Tests opt out via `VITE_LINEA_WASM=0` to cover the TypeScript implementation.
 */
const WASM_ENABLED: boolean = import.meta.env?.VITE_LINEA_WASM !== "0";

type Ptr = number;
interface SmetExports {
  memory: WebAssembly.Memory;
  input(len: number): Ptr;
  nodata(len: number): Ptr;
  clear(): void;
  data_offset(): number;
  parse_data(ncols: number, tzMinutes: number): void;
  parsed_rows(): number;
  parsed_timestamps(): Ptr;
  parsed_column(i: number): Ptr;
  parsed_missing(i: number): Ptr;
  union_timestamps(n: number): void;
  union_len(): number;
  union_timestamps_ptr(): Ptr;
  union_indices(k: number): Ptr;
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
 * Loads the WebAssembly implementation if enabled, returns whether it could be loaded.
 */
export async function tryLoadSmetWasm(): Promise<boolean> {
  if (!WASM_ENABLED) return false;
  try {
    await loadSmetWasm();
    return true;
  } catch (e) {
    if (!wasmWarned) console.warn("Failed to load smet.wasm, falling back to TypeScript", e);
    wasmWarned = true;
    return false;
  }
}
let wasmWarned = false;

/**
 * Copies `bytes` into the module buffer obtained by `buffer(len)`.
 */
function write(w: SmetExports, buffer: (len: number) => Ptr, bytes: Uint8Array): void {
  const ptr = buffer(bytes.length);
  new Uint8Array(w.memory.buffer, ptr, bytes.length).set(bytes);
}

/** the parts of the SMET header needed to parse the data lines */
export interface SMETDataHeader {
  fields: string[];
  tz: number;
  nodata: string;
  converters(): ((v: number) => number)[];
}

/**
 * Parses a SMET file: the header with `parseHeader`, the data lines in WebAssembly
 * into timestamps and unit-converted columns.
 */
export async function parseSMETBytes<H extends SMETDataHeader>(
  bytes: Uint8Array,
  parseHeader: (text: string) => H,
): Promise<{ header: H; timestamps: number[]; columns: (number | null)[][] }> {
  const w = await loadSmetWasm();
  try {
    write(w, w.input, bytes);
    const header = parseHeader(new TextDecoder().decode(bytes.subarray(0, w.data_offset())));
    write(w, w.nodata, new TextEncoder().encode(header.nodata));
    const ncols = header.fields.length;
    w.parse_data(ncols, header.tz * 60);

    const rows = w.parsed_rows();
    const timestamps = Array.from(new Float64Array(w.memory.buffer, w.parsed_timestamps(), rows));
    const converters = header.converters();
    const columns = Array.from({ length: ncols }, (_, i): (number | null)[] => {
      if (i === 0) return []; // timestamp
      const values = new Float64Array(w.memory.buffer, w.parsed_column(i), rows);
      const missing = new Uint8Array(w.memory.buffer, w.parsed_missing(i), rows);
      const convert = converters[i];
      return Array.from(values, (v, j) => (missing[j] ? null : convert(v)));
    });
    return { header, timestamps, columns };
  } finally {
    w.clear();
  }
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
  // timestamps of all inputs back to back, followed by their lengths
  const all = inputs.flat();
  const bytes = new Uint8Array(8 * all.length + 4 * inputs.length);
  new Float64Array(bytes.buffer, 0, all.length).set(all);
  new Uint32Array(bytes.buffer, 8 * all.length, inputs.length).set(inputs.map((ts) => ts.length));
  try {
    write(w, w.input, bytes);
    w.union_timestamps(inputs.length);
    const len = w.union_len();
    return {
      timestamps: Array.from(new Float64Array(w.memory.buffer, w.union_timestamps_ptr(), len)),
      indices: inputs.map((_, k) =>
        new Int32Array(w.memory.buffer, w.union_indices(k), len).slice(),
      ),
    };
  } finally {
    w.clear();
  }
}
