/**
 * @fileoverview UUID v4 generator with zero external dependencies.
 * Uses the Web Crypto API (crypto.getRandomValues) when available,
 * falling back to Math.random for environments that lack it.
 */

/**
 * Generates a UUID v4 string.
 * Uses crypto.getRandomValues for cryptographically secure randomness
 * when available (browser / modern Node.js environments).
 *
 * @returns {string} A UUID v4 string in the format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * const id = generateId();
 * // → "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
export function generateId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    return _cryptoUUID();
  }
  return _mathRandomUUID();
}

/**
 * UUID v4 via Web Crypto API (secure, preferred).
 * @returns {string}
 * @private
 */
function _cryptoUUID() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version bits to 0100 (version 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant bits to 10xx (RFC 4122 variant)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * UUID v4 via Math.random (fallback, not cryptographically secure).
 * @returns {string}
 * @private
 */
function _mathRandomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates whether a given string is a valid UUID v4.
 *
 * @param {string} value - The string to validate
 * @returns {boolean} True if the string is a valid UUID v4
 *
 * @example
 * isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479"); // true
 * isValidUUID("not-a-uuid"); // false
 */
export function isValidUUID(value) {
  if (typeof value !== 'string') return false;
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(value);
}
