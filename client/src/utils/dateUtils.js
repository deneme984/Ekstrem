/**
 * @fileoverview Turkish date formatting and calculation utilities for the Ekstrem app.
 * All functions handle null/undefined input gracefully and never throw.
 */

/**
 * Full Turkish month names (1-indexed: index 0 is unused).
 * @type {string[]}
 */
const TURKISH_MONTHS = [
  '',          // placeholder so index 1 = Ocak
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
];

/**
 * Short Turkish month abbreviations (1-indexed: index 0 is unused).
 * @type {string[]}
 */
const TURKISH_MONTHS_SHORT = [
  '',
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara'
];

/**
 * Formats an ISO date string as a full Turkish date.
 *
 * @param {string|null|undefined} isoDate - ISO date string e.g. "2026-05-24"
 * @returns {string} Formatted date e.g. "24 Mayıs 2026", or "" on invalid input
 *
 * @example
 * formatTurkishDate("2026-05-24");  // "24 Mayıs 2026"
 * formatTurkishDate(null);           // ""
 */
export function formatTurkishDate(isoDate) {
  const date = _parseDate(isoDate);
  if (!date) return '';

  const day = date.getDate();
  const month = TURKISH_MONTHS[date.getMonth() + 1];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Formats an ISO date string as a short Turkish date (day + short month).
 *
 * @param {string|null|undefined} isoDate - ISO date string
 * @returns {string} Formatted short date e.g. "24 May", or "" on invalid input
 *
 * @example
 * formatShortDate("2026-05-24");  // "24 May"
 * formatShortDate(null);           // ""
 */
export function formatShortDate(isoDate) {
  const date = _parseDate(isoDate);
  if (!date) return '';

  const day = date.getDate();
  const month = TURKISH_MONTHS_SHORT[date.getMonth() + 1];

  return `${day} ${month}`;
}

/**
 * Calculates the number of days from today until the given ISO date.
 * Returns a negative number if the date is in the past.
 *
 * @param {string|null|undefined} isoDate - ISO date string
 * @returns {number} Number of days until the date (negative = overdue), or 0 on invalid input
 *
 * @example
 * getDaysUntil("2026-06-10");  // 7  (if today is June 3)
 * getDaysUntil("2026-05-01");  // -33 (if today is June 3)
 * getDaysUntil(null);           // 0
 */
export function getDaysUntil(isoDate) {
  const date = _parseDate(isoDate);
  if (!date) return 0;

  const today = _startOfDay(new Date());
  const target = _startOfDay(date);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns the Turkish month name for a given month number.
 *
 * @param {number|null|undefined} monthNumber - Month number (1-12)
 * @returns {string} Turkish month name e.g. "Mayıs", or "" on invalid input
 *
 * @example
 * getMonthName(5);   // "Mayıs"
 * getMonthName(12);  // "Aralık"
 * getMonthName(0);   // ""
 */
export function getMonthName(monthNumber) {
  if (monthNumber == null || monthNumber < 1 || monthNumber > 12) return '';
  return TURKISH_MONTHS[monthNumber] || '';
}

/**
 * Returns the short Turkish month name for a given month number.
 *
 * @param {number|null|undefined} monthNumber - Month number (1-12)
 * @returns {string} Short Turkish month name e.g. "May", or "" on invalid input
 *
 * @example
 * getMonthNameShort(5);  // "May"
 */
export function getMonthNameShort(monthNumber) {
  if (monthNumber == null || monthNumber < 1 || monthNumber > 12) return '';
  return TURKISH_MONTHS_SHORT[monthNumber] || '';
}

/**
 * Returns the current month and year.
 *
 * @returns {{ month: number, year: number }} Current month (1-12) and year
 *
 * @example
 * getCurrentMonthYear();  // { month: 6, year: 2026 }
 */
export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}

/**
 * Returns an array of the last N months (including the current month),
 * ordered from oldest to newest.
 *
 * @param {number} n - Number of months to return (must be >= 1)
 * @returns {Array<{ month: number, year: number }>} Array of month/year objects
 *
 * @example
 * getLastNMonths(3);
 * // [{ month: 4, year: 2026 }, { month: 5, year: 2026 }, { month: 6, year: 2026 }]
 */
export function getLastNMonths(n) {
  const count = (typeof n === 'number' && n > 0) ? Math.floor(n) : 1;
  const result = [];
  const now = new Date();
  let month = now.getMonth() + 1; // 1-12
  let year = now.getFullYear();

  for (let i = 0; i < count; i++) {
    result.unshift({ month, year });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return result;
}

/**
 * Checks whether an ISO date is in the past (overdue).
 *
 * @param {string|null|undefined} isoDate - ISO date string to check
 * @returns {boolean} True if the date is before today, false otherwise
 *
 * @example
 * isOverdue("2026-05-01");  // true  (if today is June 3, 2026)
 * isOverdue("2026-07-01");  // false
 * isOverdue(null);           // false
 */
export function isOverdue(isoDate) {
  const date = _parseDate(isoDate);
  if (!date) return false;

  const today = _startOfDay(new Date());
  return _startOfDay(date).getTime() < today.getTime();
}

/**
 * Formats an ISO date string as "MM/YYYY" (used for statement period display).
 *
 * @param {string|null|undefined} isoDate - ISO date string
 * @returns {string} Formatted period e.g. "05/2026", or "" on invalid input
 *
 * @example
 * formatPeriod("2026-05-24");  // "05/2026"
 */
export function formatPeriod(isoDate) {
  const date = _parseDate(isoDate);
  if (!date) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${year}`;
}

/**
 * Converts a month number and year into an ISO date string for the first day of that month.
 *
 * @param {number} month - Month number (1-12)
 * @param {number} year - Full year e.g. 2026
 * @returns {string} ISO date string e.g. "2026-05-01"
 *
 * @example
 * monthYearToISO(5, 2026);  // "2026-05-01"
 */
export function monthYearToISO(month, year) {
  if (!month || !year) return '';
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-01`;
}

/**
 * Returns a human-readable relative label for a date (Bugün, Yarın, X gün sonra, X gün geçti).
 *
 * @param {string|null|undefined} isoDate - ISO date string
 * @returns {string} Human-readable label in Turkish
 *
 * @example
 * getRelativeLabel("2026-06-03");  // "Bugün"
 * getRelativeLabel("2026-06-04");  // "Yarın"
 * getRelativeLabel("2026-06-10");  // "7 gün sonra"
 * getRelativeLabel("2026-05-30");  // "4 gün geçti"
 */
export function getRelativeLabel(isoDate) {
  const days = getDaysUntil(isoDate);
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  if (days > 1) return `${days} gün sonra`;
  return `${Math.abs(days)} gün geçti`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Safely parses an ISO date string or Date object into a Date.
 * Returns null if the input is invalid.
 * @param {string|Date|null|undefined} value
 * @returns {Date|null}
 * @private
 */
function _parseDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns a Date object set to midnight (start of day) in local time.
 * @param {Date} date
 * @returns {Date}
 * @private
 */
function _startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
