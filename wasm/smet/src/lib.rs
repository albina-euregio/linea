//! Hot loops of linea's SMET parsing and timestamp merging, compiled to WebAssembly.
//!
//! Plain `extern "C"` exports operating on buffers owned by the module, see `src/data/smet-wasm.ts`.
//! Header parsing and unit conversion stay in TypeScript.

use std::cell::RefCell;

/// Buffers shared with JavaScript. JavaScript writes its input into the buffers returned by
/// [`input`] and [`nodata`], and reads the results of the last call via the getters.
/// Calls are synchronous and the module is single-threaded, so one state suffices.
#[derive(Default)]
struct State {
    input: Vec<u8>,
    nodata: Vec<u8>,
    parsed: Parsed,
    union: Union,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::default();
}

fn with_state<T>(f: impl FnOnce(&mut State) -> T) -> T {
    STATE.with_borrow_mut(f)
}

/// Resizes `buffer` to `len` zero bytes and returns its address for JavaScript to write into.
fn resize(buffer: &mut Vec<u8>, len: usize) -> *mut u8 {
    buffer.clear();
    buffer.resize(len, 0);
    buffer.as_mut_ptr()
}

/// Returns the address of the input buffer resized to `len` bytes.
#[unsafe(no_mangle)]
pub extern "C" fn input(len: usize) -> *mut u8 {
    with_state(|s| resize(&mut s.input, len))
}

/// Returns the address of the `nodata` buffer resized to `len` bytes.
#[unsafe(no_mangle)]
pub extern "C" fn nodata(len: usize) -> *mut u8 {
    with_state(|s| resize(&mut s.nodata, len))
}

/// Frees all buffers and results.
#[unsafe(no_mangle)]
pub extern "C" fn clear() {
    with_state(|s| *s = State::default());
}

// ---------------------------------------------------------------------------
// SMET data parsing
// ---------------------------------------------------------------------------

/// A data line starts with a date `YYYY-MM-DD`.
fn is_data_line(line: &[u8]) -> bool {
    line.len() >= 10
        && line[..4].iter().all(u8::is_ascii_digit)
        && line[4] == b'-'
        && line[5..7].iter().all(u8::is_ascii_digit)
        && line[7] == b'-'
        && line[8..10].iter().all(u8::is_ascii_digit)
}

/// Returns the byte offset of the first data line in the input, i.e. the length of the header.
#[unsafe(no_mangle)]
pub extern "C" fn data_offset() -> usize {
    with_state(|s| data_offset_of(&s.input))
}

fn data_offset_of(bytes: &[u8]) -> usize {
    let mut offset = 0;
    for line in bytes.split_inclusive(|&b| b == b'\n') {
        if is_data_line(line) {
            return offset;
        }
        offset += line.len();
    }
    bytes.len()
}

#[derive(Default)]
struct Parsed {
    timestamps: Vec<f64>,
    /// one column per field, column 0 (timestamp) stays empty, NaN for `nodata`
    columns: Vec<Vec<f64>>,
}

/// Parses all data lines of the input into timestamps (epoch milliseconds) and one column per field.
/// Timestamps without explicit offset are interpreted in `tz_minutes` east of UTC.
#[unsafe(no_mangle)]
pub extern "C" fn parse_data(ncols: usize, tz_minutes: f64) {
    with_state(|s| s.parsed = parse(&s.input, ncols, tz_minutes, &s.nodata));
}

fn parse(bytes: &[u8], ncols: usize, tz_minutes: f64, nodata: &[u8]) -> Parsed {
    let mut parsed = Parsed {
        timestamps: Vec::new(),
        columns: vec![Vec::new(); ncols],
    };
    for line in bytes.split(|&b| b == b'\n') {
        if !is_data_line(line) {
            continue;
        }
        let mut cells = line
            .split(u8::is_ascii_whitespace)
            .filter(|c| !c.is_empty());
        let Some(date) = cells.next() else { continue };
        parsed.timestamps.push(parse_timestamp(date, tz_minutes));
        for i in 1..ncols {
            let value = match cells.next() {
                Some(cell) if cell != nodata => parse_number(cell),
                _ => f64::NAN,
            };
            parsed.columns[i].push(value);
        }
    }
    parsed
}

/// Parses a decimal number, accepting `,` as decimal separator. Invalid input yields NaN.
fn parse_number(cell: &[u8]) -> f64 {
    let Ok(text) = std::str::from_utf8(cell) else {
        return f64::NAN;
    };
    let parsed = if cell.contains(&b',') {
        text.replacen(',', ".", 1).parse()
    } else {
        text.parse()
    };
    parsed.unwrap_or(f64::NAN)
}

fn digits(bytes: &[u8]) -> Option<i64> {
    if bytes.is_empty() || !bytes.iter().all(u8::is_ascii_digit) {
        return None;
    }
    Some(bytes.iter().fold(0, |n, &b| n * 10 + i64::from(b - b'0')))
}

/// Parses `YYYY-MM-DD[THH:MM[:SS[.fff]]][Z|±HH:MM]` to epoch milliseconds, NaN if invalid.
fn parse_timestamp(s: &[u8], tz_minutes: f64) -> f64 {
    parse_timestamp_opt(s, tz_minutes).unwrap_or(f64::NAN)
}

fn parse_timestamp_opt(s: &[u8], tz_minutes: f64) -> Option<f64> {
    let year = digits(s.get(0..4)?)?;
    let month = digits(s.get(5..7)?)?;
    let day = digits(s.get(8..10)?)?;
    let mut rest = &s[10..];

    let (mut hour, mut minute, mut second) = (0, 0, 0.0);
    if let [b'T', time @ ..] = rest {
        hour = digits(time.get(0..2)?)?;
        if time.get(2) != Some(&b':') {
            return None;
        }
        minute = digits(time.get(3..5)?)?;
        rest = &time[5..];
        if let [b':', sec @ ..] = rest {
            let end = sec
                .iter()
                .position(|&b| !(b.is_ascii_digit() || b == b'.'))
                .unwrap_or(sec.len());
            second = std::str::from_utf8(&sec[..end]).ok()?.parse().ok()?;
            rest = &sec[end..];
        }
    }

    let offset_minutes = match rest {
        [] => tz_minutes,
        [b'Z'] => 0.0,
        [sign @ (b'+' | b'-'), offset @ ..] => {
            let hh = digits(offset.get(0..2)?)?;
            let mm = match offset.get(2..) {
                Some([b':', mm @ ..]) | Some(mm) if !mm.is_empty() => digits(mm)?,
                _ => 0,
            };
            let minutes = (hh * 60 + mm) as f64;
            if *sign == b'-' { -minutes } else { minutes }
        }
        _ => return None,
    };

    let days = days_from_civil(year, month, day) as f64;
    let seconds = days * 86400.0 + (hour * 3600 + minute * 60) as f64 + second;
    Some((seconds - offset_minutes * 60.0) * 1000.0)
}

/// Days since 1970-01-01 for a proleptic Gregorian date, see http://howardhinnant.github.io/date_algorithms.html
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let y = if month <= 2 { year - 1 } else { year };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (month + 9) % 12;
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_rows() -> usize {
    with_state(|s| s.parsed.timestamps.len())
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_timestamps() -> *const f64 {
    with_state(|s| s.parsed.timestamps.as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_column(i: usize) -> *const f64 {
    with_state(|s| s.parsed.columns[i].as_ptr())
}

// ---------------------------------------------------------------------------
// Timestamp union for merging stations
// ---------------------------------------------------------------------------

#[derive(Default)]
struct Union {
    timestamps: Vec<f64>,
    /// per input: for each union timestamp the index in that input, or -1 if absent
    indices: Vec<Vec<i32>>,
}

/// Computes the sorted, de-duplicated union of `n` timestamp arrays, and for each input the
/// source index of each union timestamp. The input holds the little-endian f64 timestamps of all
/// arrays back to back, followed by their `n` little-endian u32 lengths.
#[unsafe(no_mangle)]
pub extern "C" fn union_timestamps(n: usize) {
    with_state(|s| {
        let (all, lens) = s.input.split_at(s.input.len() - 4 * n);
        let lens: Vec<usize> = lens
            .chunks_exact(4)
            .map(|b| u32::from_le_bytes(b.try_into().unwrap()) as usize)
            .collect();
        let all: Vec<f64> = all
            .chunks_exact(8)
            .map(|b| f64::from_le_bytes(b.try_into().unwrap()))
            .collect();
        s.union = union(&lens, &all);
    });
}

fn union(lens: &[usize], all: &[f64]) -> Union {
    let mut timestamps = all.to_vec();
    timestamps.sort_unstable_by(f64::total_cmp);
    timestamps.dedup();

    let mut indices = Vec::with_capacity(lens.len());
    let mut offset = 0;
    for &len in lens {
        let source = &all[offset..offset + len];
        offset += len;
        let mut index = vec![-1; timestamps.len()];
        for (i, t) in source.iter().enumerate() {
            if let Ok(pos) = timestamps.binary_search_by(|x| x.total_cmp(t)) {
                index[pos] = i as i32;
            }
        }
        indices.push(index);
    }
    Union {
        timestamps,
        indices,
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn union_len() -> usize {
    with_state(|s| s.union.timestamps.len())
}

#[unsafe(no_mangle)]
pub extern "C" fn union_timestamps_ptr() -> *const f64 {
    with_state(|s| s.union.timestamps.as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn union_indices(k: usize) -> *const i32 {
    with_state(|s| s.union.indices[k].as_ptr())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timestamps() {
        let ms = |s: &str| parse_timestamp(s.as_bytes(), 60.0);
        assert_eq!(ms("1970-01-01T00:00:00Z"), 0.0);
        assert_eq!(ms("1970-01-01T01:00:00"), 0.0);
        assert_eq!(ms("2025-11-26T19:00:00+01:00"), 1764180000000.0);
        assert_eq!(ms("2025-11-26T19:00:00-01:30"), 1764189000000.0);
        assert_eq!(ms("2025-11-26T19:00:00-0130"), 1764189000000.0);
        assert!(ms("2025-11-26X").is_nan());
    }

    #[test]
    fn numbers() {
        assert_eq!(parse_number(b"273.15"), 273.15);
        assert_eq!(parse_number(b"0,5"), 0.5);
        assert!(parse_number(b"abc").is_nan());
    }

    #[test]
    fn data() {
        let smet = b"fields = timestamp TA HS\n[DATA]\n2025-11-26T19:00:00Z 273.15 -777\r\n";
        assert_eq!(data_offset_of(smet), 32);
        let parsed = parse(smet, 3, 0.0, b"-777");
        assert_eq!(parsed.timestamps, [1764183600000.0]);
        assert_eq!(parsed.columns[1], [273.15]);
        assert!(parsed.columns[2][0].is_nan());
    }

    #[test]
    fn unions() {
        let u = union(&[2, 2], &[3.0, 4.0, 2.0, 3.0]);
        assert_eq!(u.timestamps, [2.0, 3.0, 4.0]);
        assert_eq!(u.indices, [vec![-1, 0, 1], vec![0, 1, -1]]);
    }
}
