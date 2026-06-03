// Structured logger — no external dependencies
// Format: [ISO_TIMESTAMP] [LEVEL] message {meta}
// Production (NODE_ENV=production): error + warn only
// Development: all levels (error, warn, info, debug)

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const isProduction = process.env.NODE_ENV === 'production';
const maxLevel = isProduction ? LEVELS.warn : LEVELS.debug;

function timestamp() {
  return new Date().toISOString();
}

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return ' [unserializable meta]';
  }
}

function write(level, message, meta) {
  if (LEVELS[level] > maxLevel) return;

  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const logger = {
  error: (message, meta = {}) => write('error', message, meta),
  warn:  (message, meta = {}) => write('warn',  message, meta),
  info:  (message, meta = {}) => write('info',  message, meta),
  debug: (message, meta = {}) => write('debug', message, meta),
};

export default logger;
