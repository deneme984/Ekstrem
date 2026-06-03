import logger from '../utils/logger.js';

/**
 * Global Express error handler — register LAST via app.use(errorHandler)
 *
 * Response format: { error: string, code: string, details?: any }
 * All user-facing messages are in Turkish.
 */
export default function errorHandler(err, req, res, next) {
  // If response already started, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // ── Multer upload errors ──────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    let message = 'Dosya yüklenirken bir hata oluştu.';
    let code = 'UPLOAD_ERROR';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Dosya boyutu çok büyük. Lütfen daha küçük bir dosya yükleyin.';
      code = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Geçersiz dosya alanı.';
      code = 'UNEXPECTED_FILE';
    }

    return res.status(400).json({ error: message, code });
  }

  // ── Wrong file type (thrown manually in route/middleware) ─────────────────
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Desteklenmeyen dosya türü. Lütfen PDF dosyası yükleyin.',
      code:  'INVALID_FILE_TYPE',
    });
  }

  // ── Google API — quota exceeded ──────────────────────────────────────────
  if (err.code === 429 || err.status === 429 || err.message?.includes('quota')) {
    return res.status(429).json({
      error: 'Google API kota limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
      code:  'GOOGLE_QUOTA_EXCEEDED',
    });
  }

  // ── Google API — invalid/expired token ───────────────────────────────────
  if (
    err.message?.includes('invalid_token') ||
    err.message?.includes('Invalid Credentials') ||
    err.code === 401
  ) {
    return res.status(401).json({
      error: 'Oturumunuz sona erdi. Tekrar giriş yapın.',
      code:  'INVALID_TOKEN',
    });
  }

  // ── Google API — connection refused / unavailable ─────────────────────────
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    return res.status(503).json({
      error: 'Google API\'ye bağlanılamadı. Lütfen daha sonra tekrar deneyin.',
      code:  'GOOGLE_API_UNAVAILABLE',
    });
  }

  // ── PDF parse errors ──────────────────────────────────────────────────────
  if (err.code === 'PDF_PARSE_ERROR' || err.message?.toLowerCase().includes('pdf')) {
    return res.status(422).json({
      error:   'PDF dosyası işlenemedi. Dosyanın bozuk olmadığından emin olun.',
      code:    'PDF_PARSE_ERROR',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }

  // ── Validation / bad request ──────────────────────────────────────────────
  if (err.status === 400 || err.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      error:   err.message || 'Geçersiz istek parametreleri.',
      code:    'VALIDATION_ERROR',
      details: err.details,
    });
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (err.status === 404) {
    return res.status(404).json({
      error: err.message || 'Kaynak bulunamadı.',
      code:  'NOT_FOUND',
    });
  }

  // ── Generic 500 ───────────────────────────────────────────────────────────
  logger.error('Unhandled server error', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
  });

  return res.status(500).json({
    error:   'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    code:    'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
}
