/**
 * PDF Routes — Ekstrem v1.0
 * 
 * Mounts:
 *   POST /api/pdf/upload           → Upload and parse a credit card statement PDF
 *   GET  /api/pdf/supported-banks  → List all supported banks
 */

import { Router } from 'express';
import multer from 'multer';
import { uploadAndParse, getSupportedBanks } from '../controllers/pdfController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Multer: store PDF in memory (up to 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    const isPdf = file.mimetype === 'application/pdf' ||
                  file.originalname?.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return cb(new Error('Yalnızca PDF dosyaları kabul edilmektedir'), false);
    }
    cb(null, true);
  },
});

// Multer error handler middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'Dosya boyutu çok büyük (maksimum 50MB)',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Dosya yükleme hatası: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'INVALID_FILE',
    });
  }
  next();
}

// Routes
router.post(
  '/upload',
  requireAuth,
  (req, res, next) => upload.single('pdf')(req, res, err => handleMulterError(err, req, res, next)),
  uploadAndParse
);

router.get('/supported-banks', getSupportedBanks);

export default router;
