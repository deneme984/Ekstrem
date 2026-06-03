/**
 * @fileoverview Turkish Lira (TRY) currency formatting utilities for the Ekstrem app.
 * Turkish number format uses dot (.) as thousands separator and comma (,) as decimal separator.
 * All amounts are assumed to be in TRY unless otherwise noted.
 */

/**
 * Formats a number as Turkish Lira with full precision.
 * Uses Turkish locale conventions: dot for thousands, comma for decimals.
 *
 * @param {number|null|undefined} amount - The amount to format
 * @returns {string} Formatted string e.g. "Ôé║18.240,50"
 *
 * @example
 * formatTRY(18240.5);   // "Ôé║18.240,50"
 * formatTRY(1000);      // "Ôé║1.000,00"
 * formatTRY(0);         // "Ôé║0,00"
 * formatTRY(null);      // "Ôé║0,00"
 */
export function formatTRY(amount) {
  const value = _toSafeNumber(amount);
  return (
    'Ôé║' +
    value.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
}

/**
 * Formats a number as compact Turkish Lira for small display areas.
 * Abbreviates large numbers using B (Bin/Thousand) and M (Milyon/Million) suffixes.
 *
 * @param {number|null|undefined} amount - The amount to format
 * @returns {string} Compact formatted string e.g. "Ôé║18.2B" or "Ôé║1.2M"
 *
 * @example
 * formatTRYCompact(18240);      // "Ôé║18.2B"
 * formatTRYCompact(1250000);    // "Ôé║1.25M"
 * formatTRYCompact(950);        // "Ôé║950"
 * formatTRYCompact(null);       // "Ôé║0"
 */
export function formatTRYCompact(amount) {
  const value = _toSafeNumber(amount);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const formatted = _compactNumber(m);
    return `${sign}Ôé║${formatted}M`;
  }

  if (abs >= 1_000) {
    const k = abs / 1_000;
    const formatted = _compactNumber(k);
    return `${sign}Ôé║${formatted}B`;
  }

  return `${sign}Ôé║${Math.round(abs).toLocaleString('tr-TR')}`;
}

/**
 * Formats a number as a signed Turkish Lira difference value.
 * Positive values receive a "+" prefix; negative values show "-".
 *
 * @param {number|null|undefined} amount - The amount to format (can be positive or negative)
 * @returns {string} Signed formatted string e.g. "+Ôé║1.240,00" or "-Ôé║800,00"
 *
 * @example
 * formatTRYDiff(1240);    // "+Ôé║1.240,00"
 * formatTRYDiff(-800);    // "-Ôé║800,00"
 * formatTRYDiff(0);       // "Ôé║0,00"
 * formatTRYDiff(null);    // "Ôé║0,00"
 */
export function formatTRYDiff(amount) {
  const value = _toSafeNumber(amount);
  const formatted = Math.abs(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (value > 0) return `+Ôé║${formatted}`;
  if (value < 0) return `-Ôé║${formatted}`;
  return `Ôé║${formatted}`;
}

/**
 * Parses a formatted Turkish Lira string back to a number.
 * Handles strings with Ôé║ prefix, dots as thousand separators, and commas as decimals.
 *
 * @param {string|null|undefined} str - The formatted string to parse
 * @returns {number} Parsed numeric value, or 0 if parsing fails
 *
 * @example
 * parseTRY("Ôé║18.240,50");   // 18240.5
 * parseTRY("18.240,50");    // 18240.5
 * parseTRY("+Ôé║1.240,00");   // 1240
 * parseTRY("-Ôé║800,00");     // -800
 * parseTRY(null);           // 0
 */
export function parseTRY(str) {
  if (str == null) return 0;
  if (typeof str === 'number') return isFinite(str) ? str : 0;

  const cleaned = String(str)
    .replace(/Ôé║/g, '')   // remove currency symbol
    .replace(/\+/g, '')  // remove explicit plus sign
    .trim()
    .replace(/\./g, '')  // remove thousand separators (dots)
    .replace(/,/g, '.');  // convert decimal comma to dot

  const parsed = parseFloat(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

/**
 * Formats a percentage value with Turkish locale conventions.
 *
 * @param {number|null|undefined} value - The percentage value (0-100)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} Formatted percentage string e.g. "%42,5"
 *
 * @example
 * formatPercent(42.5);   // "%42,5"
 * formatPercent(100);    // "%100,0"
 */
export function formatPercent(value, decimals = 1) {
  const safe = _toSafeNumber(value);
  return (
    '%' +
    safe.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  );
}

// ÔöÇÔöÇÔöÇ Private helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

/**
 * Converts any value to a safe finite number, defaulting to 0.
 * @param {*} value
 * @returns {number}
 * @private
 */
function _toSafeNumber(value) {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n : 0;
}

/**
 * Formats a compact number with up to 2 significant decimal places,
 * using Turkish locale separators.
 * @param {number} n
 * @returns {string}
 * @private
 */
function _compactNumber(n) {
  if (n >= 100) {
    return Math.round(n).toLocaleString('tr-TR');
  }
  if (n >= 10) {
    return n.toLocaleString('tr-TR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
