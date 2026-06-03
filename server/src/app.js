import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    ua: req.headers['user-agent']?.slice(0, 60),
  });
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    app:       'Ekstrem API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Route mounting ─────────────────────────────────────────────────────────────

// Auth routes
try {
  const { default: authRouter } = await import('./routes/auth.js');
  app.use('/api/auth', authRouter);
  logger.info('Auth routes mounted at /api/auth');
} catch (e) {
  logger.warn('Auth routes not ready', { error: e.message });
}

// Gmail routes
try {
  const { default: gmailRouter } = await import('./routes/gmail.js');
  app.use('/api/gmail', gmailRouter);
  logger.info('Gmail routes mounted at /api/gmail');
} catch (e) {
  logger.warn('Gmail routes not ready', { error: e.message });
}

// PDF routes
try {
  const { default: pdfRouter } = await import('./routes/pdf.js');
  app.use('/api/pdf', pdfRouter);
  logger.info('PDF routes mounted at /api/pdf');
} catch (e) {
  logger.warn('PDF routes not ready', { error: e.message });
}

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı', path: req.originalUrl });
});

// ── Global error handler (must be last middleware) ────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info('Ekstrem API running', {
    url: `http://localhost:${PORT}`,
    env: process.env.NODE_ENV || 'development',
  });
});

export default app;
