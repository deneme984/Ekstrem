/**
 * PDF Controller — Ekstrem v1.0
 * 
 * Handles PDF upload and parsing endpoints:
 *   POST /api/pdf/upload      → uploadAndParse()
 *   GET  /api/pdf/supported-banks → getSupportedBanks()
 */

import path from 'path';
import { parseStatement, detectBankFromPdf, getSupportedBanksList } from '../services/parser/index.js';
import { BANK_BY_ID } from '../config/banks.js';

// ---------------------------------------------------------------------------
// POST /api/pdf/upload
// ---------------------------------------------------------------------------

/**
 * uploadAndParse
 * 
 * Accepts multipart/form-data:
 *   - pdf: PDF file (required)
 *   - bankId: string (optional — auto-detected from filename/content if omitted)
 *   - tckn: string (optional — for TCKN-encrypted PDFs)
 * 
 * Returns: ParsedStatement JSON object
 */
async function uploadAndParse(req, res) {
  try {
    // multer stores the file in req.file (memory storage)
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'PDF dosyası gerekli',
        code: 'MISSING_FILE',
      });
    }

    const pdfBuffer = req.file.buffer;
    const originalFilename = req.file.originalname || '';
    const tckn = req.body?.tckn || null;

    // Determine bank ID: from body, filename, or auto-detect
    let bankId = req.body?.bankId || null;

    if (!bankId) {
      bankId = _detectBankFromFilename(originalFilename);
    }

    if (!bankId) {
      bankId = await detectBankFromPdf(pdfBuffer);
    }

    // Parse the PDF
    const parsed = await parseStatement(pdfBuffer, bankId, { tckn });

    // If the PDF requires TCKN and none was provided, return appropriate response
    if (parsed.requiresTCKN && !tckn) {
      const bankInfo = bankId ? BANK_BY_ID[bankId] : null;
      return res.status(422).json({
        success: false,
        requiresTCKN: true,
        bankId: parsed.bankId,
        bankName: bankInfo?.shortName || 'Bilinmiyor',
        encryptionHint: bankInfo?.pdfPasswordFormat || 'T.C. Kimlik Numarası gerekli',
        error: 'Bu PDF şifreli. Lütfen T.C. Kimlik Numaranızı girin.',
        code: 'REQUIRES_TCKN',
      });
    }

    // Success response
    return res.status(200).json({
      success: parsed.parseSuccess,
      bankId: parsed.bankId,
      bankName: BANK_BY_ID[parsed.bankId]?.shortName || parsed.bankId,
      data: parsed,
      warnings: parsed.parseErrors?.length > 0 ? parsed.parseErrors : undefined,
      meta: {
        filename: originalFilename,
        fileSize: pdfBuffer.length,
        parsedAt: new Date().toISOString(),
        transactionCount: parsed.transactions?.length || 0,
      },
    });

  } catch (err) {
    console.error('[pdfController] uploadAndParse error:', err);
    return res.status(500).json({
      success: false,
      error: 'PDF işleme hatası',
      detail: err.message,
      code: 'PARSE_ERROR',
    });
  }
}

// ---------------------------------------------------------------------------
// GET /api/pdf/supported-banks
// ---------------------------------------------------------------------------

/**
 * getSupportedBanks
 * 
 * Returns the list of all supported banks with their parser status,
 * encryption requirements, and card products.
 */
function getSupportedBanks(req, res) {
  try {
    const banks = getSupportedBanksList();
    return res.status(200).json({
      success: true,
      count: banks.length,
      banks,
    });
  } catch (err) {
    console.error('[pdfController] getSupportedBanks error:', err);
    return res.status(500).json({
      success: false,
      error: 'Banka listesi alınamadı',
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to identify the bank from the PDF filename.
 * Many banks name their exported PDFs with their brand.
 * 
 * @param {string} filename
 * @returns {string|null} bankId
 */
function _detectBankFromFilename(filename) {
  if (!filename) return null;
  const lower = filename.toLowerCase();

  const FILENAME_PATTERNS = [
    { pattern: /yapi\s*kredi|worldcard|world_card/i, bankId: 'yapikredi' },
    { pattern: /garanti|garantibbva|bonus.*garanti/i, bankId: 'garantibbva' },
    { pattern: /isbank|i[sş]bank|maximum|maximiles/i, bankId: 'isbank' },
    { pattern: /akbank|axess/i, bankId: 'akbank' },
    { pattern: /qnb|finansbank|cardfinans/i, bankId: 'qnbfinansbank' },
    { pattern: /enpara/i, bankId: 'enpara' },
    { pattern: /denizbank/i, bankId: 'denizbank' },
    { pattern: /ziraat|bankkart/i, bankId: 'ziraat' },
    { pattern: /vakifbank|vakif.?bank/i, bankId: 'vakifbank' },
    { pattern: /halkbank|paraf/i, bankId: 'halkbank' },
    { pattern: /ing/i, bankId: 'ing' },
    { pattern: /hsbc/i, bankId: 'hsbc' },
    { pattern: /\bteb\b|turk.?ekonomi|cepteteb/i, bankId: 'teb' },
    { pattern: /[sş]ekerbank|seker.?bonus/i, bankId: 'sekerbank' },
    { pattern: /odeabank|odea|bank.?o.?card/i, bankId: 'odeabank' },
  ];

  for (const { pattern, bankId } of FILENAME_PATTERNS) {
    if (pattern.test(lower)) return bankId;
  }

  return null;
}

export { uploadAndParse, getSupportedBanks };
