/**
 * @fileoverview Logger utility — Ekstrem v1.0
 *
 * Lightweight structured logger used across the server codebase.
 * Uses process.stdout/stderr (no bare console.log) so output can be piped
 * and filtered by log level via the LOG_LEVEL environment variable.
 *
 * Supported log levels (lowest → highest): debug, info, warn, error.
 * Set LOG_LEVEL=debug in .env to enable verbose logging.
 *
 * In production this can be replaced with a proper logger (e.g. winston/pino)
 * without changing any call sites, since the interface is identical.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

/**
 * Format a log entry to a structured ISO-timestamp string.
 *
 * @param {string} level   - Log level name
 * @param {string} message - Human-readable message
 * @param {Object} [context] - Optional structured context object
 * @returns {string}
 */
function format(level, message, context) {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`;
}

export const logger = {
  /**
   * Log a debug-level message (only emitted when LOG_LEVEL=debug).
   *
   * @param {string} message
   * @param {Object} [context]
   */
  debug(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.debug) {
      process.stdout.write(format('debug', message, context) + '\n');
    }
  },

  /**
   * Log an informational message.
   *
   * @param {string} message
   * @param {Object} [context]
   */
  info(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.info) {
      process.stdout.write(format('info', message, context) + '\n');
    }
  },

  /**
   * Log a warning message.
   *
   * @param {string} message
   * @param {Object} [context]
   */
  warn(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.warn) {
      process.stderr.write(format('warn', message, context) + '\n');
    }
  },

  /**
   * Log an error message.
   *
   * @param {string} message
   * @param {Object} [context]
   */
  error(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.error) {
      process.stderr.write(format('error', message, context) + '\n');
    }
  },
};

export default logger;
