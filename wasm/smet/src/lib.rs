//! Hot loops of linea's SMET parsing and timestamp merging, compiled to WebAssembly.
//!
//! Plain `extern "C"` exports operating on the module's linear memory, see `src/data/smet-wasm.ts`.
//! Header parsing and unit conversion stay in TypeScript.

use std::alloc::{Layout, alloc as std_alloc, dealloc as std_dealloc};
use std::slice;

fn layout(len: usize) -> Layout {
    Layout::from_size_align(len, 8).unwrap()
}

/// Allocates `len` bytes (8-byte aligned) for input buffers written by JavaScript.
#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    if len == 0 {
        return std::ptr::NonNull::dangling().as_ptr();
    }
    unsafe { std_alloc(layout(len)) }
}

/// Frees a buffer obtained from [`alloc`].
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    if len != 0 {
        unsafe { std_dealloc(ptr, layout(len)) }
    }
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

/// Returns the byte offset of the first data line, i.e. the length of the header.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn data_offset(ptr: *const u8, len: usize) -> usize {
    let bytes = unsafe { slice::from_raw_parts(ptr, len) };
    let mut offset = 0;
    for line in bytes.split_inclusive(|&b| b == b'\n') {
        if is_data_line(line) {
            return offset;
        }
        offset += line.len();
    }
    bytes.len()
}

pub struct Parsed {
    timestamps: Vec<f64>,
    /// one column per field, column 0 (timestamp) stays empty
    columns: Vec<Vec<f64>>,
    /// 1 where the value is `nodata`, i.e. `null` in JavaScript
    missing: Vec<Vec<u8>>,
}

/// Parses all data lines into timestamps (epoch milliseconds) and one column per field.
/// Timestamps without explicit offset are interpreted in `tz_minutes` east of UTC.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn parse_data(
    ptr: *const u8,
    len: usize,
    ncols: usize,
    tz_minutes: f64,
    nodata_ptr: *const u8,
    nodata_len: usize,
) -> *mut Parsed {
    let bytes = unsafe { slice::from_raw_parts(ptr, len) };
    let nodata = unsafe { slice::from_raw_parts(nodata_ptr, nodata_len) };
    let mut parsed = Parsed {
        timestamps: Vec::new(),
        columns: vec![Vec::new(); ncols],
        missing: vec![Vec::new(); ncols],
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
            let (value, missing) = match cells.next() {
                Some(cell) if cell != nodata => (parse_number(cell), 0),
                _ => (f64::NAN, 1),
            };
            parsed.columns[i].push(value);
            parsed.missing[i].push(missing);
        }
    }
    Box::into_raw(Box::new(parsed))
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
pub extern "C" fn parsed_rows(p: &Parsed) -> usize {
    p.timestamps.len()
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_timestamps(p: &Parsed) -> *const f64 {
    p.timestamps.as_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_column(p: &Parsed, i: usize) -> *const f64 {
    p.columns[i].as_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn parsed_missing(p: &Parsed, i: usize) -> *const u8 {
    p.missing[i].as_ptr()
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn parsed_free(p: *mut Parsed) {
    drop(unsafe { Box::from_raw(p) });
}

// ---------------------------------------------------------------------------
// Timestamp union for merging stations
// ---------------------------------------------------------------------------

pub struct Union {
    timestamps: Vec<f64>,
    /// per input: for each union timestamp the index in that input, or -1 if absent
    indices: Vec<Vec<i32>>,
}

/// Computes the sorted, de-duplicated union of `n` timestamp arrays stored back to back at `ptr`
/// (with lengths at `lens_ptr`), and for each input the source index of each union timestamp.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn union_timestamps(
    ptr: *const f64,
    lens_ptr: *const u32,
    n: usize,
) -> *mut Union {
    let lens = unsafe { slice::from_raw_parts(lens_ptr, n) };
    let total = lens.iter().map(|&l| l as usize).sum();
    let all = unsafe { slice::from_raw_parts(ptr, total) };

    let mut timestamps = all.to_vec();
    timestamps.sort_unstable_by(f64::total_cmp);
    timestamps.dedup();

    let mut indices = Vec::with_capacity(n);
    let mut offset = 0;
    for &len in lens {
        let source = &all[offset..offset + len as usize];
        offset += len as usize;
        let mut index = vec![-1; timestamps.len()];
        for (i, t) in source.iter().enumerate() {
            if let Ok(pos) = timestamps.binary_search_by(|x| x.total_cmp(t)) {
                index[pos] = i as i32;
            }
        }
        indices.push(index);
    }
    Box::into_raw(Box::new(Union {
        timestamps,
        indices,
    }))
}

#[unsafe(no_mangle)]
pub extern "C" fn union_len(u: &Union) -> usize {
    u.timestamps.len()
}

#[unsafe(no_mangle)]
pub extern "C" fn union_timestamps_ptr(u: &Union) -> *const f64 {
    u.timestamps.as_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn union_indices(u: &Union, k: usize) -> *const i32 {
    u.indices[k].as_ptr()
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn union_free(u: *mut Union) {
    drop(unsafe { Box::from_raw(u) });
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
}
