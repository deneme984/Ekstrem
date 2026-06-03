/**
 * PDF Parser Router — Ekstrem v1.0
 * 
 * Central dispatcher that routes PDF buffers to the appropriate bank parser
 * and returns a standardized ParsedStatement object.
 * 
 * Supported banks (15 total):
 *   Unencrypted (10): yapikredi, isbank, akbank, qnbfinansbank, enpara,
 *                     ing, hsbc, teb, sekerbank, odeabank
 *   TCKN-encrypted (5): garantibbva, denizbank, ziraat, vakifbank, halkbank
 */

import { BANK_BY_ID, BANK_REGISTRY } from '../../config/banks.js';

import YapiKrediParser from './banks/yapikredi.js';
import GarantiBBVAParser from './banks/garantibbva.js';
import IsBankParser from './banks/isbank.js';
import AkbankParser from './banks/akbank.js';
import QNBFinansbankParser from './banks/qnbfinansbank.js';
import EnparaParser from './banks/enpara.js';
import DenizbankParser from './banks/denizbank.js';
import ZiraatParser from './banks/ziraat.js';
import VakifbankParser from './banks/vakifbank.js';
import HalkbankParser from './banks/halkbank.js';
import INGParser from './banks/ing.js';
import HSBCParser from './banks/hsbc.js';
import TEBParser from './banks/teb.js';
import SekerbankParser from './banks/sekerbank.js';
import OdeabankParser from './banks/odeabank.js';

// ---------------------------------------------------------------------------
// Parser Registry
// ---------------------------------------------------------------------------

const PARSER_MAP = {
  yapikredi:     YapiKrediParser,
  garantibbva:   GarantiBBVAParser,
  isbank:        IsBankParser,
  akbank:        AkbankParser,
  qnbfinansbank: QNBFinansbankParser,
  enpara:        EnparaParser,
  denizbank:     DenizbankParser,
  ziraat:        ZiraatParser,
  vakifbank:     VakifbankParser,
  halkbank:      HalkbankParser,
  ing:           INGParser,
  hsbc:          HSBCParser,
  teb:           TEBParser,
  sekerbank:     SekerbankParser,
  odeabank:      OdeabankParser,
};

// Banks whose PDFs are encrypted with TCKN
const TCKN_ENCRYPTED_BANKS = new Set([
  'garantibbva',
  'denizbank',
  'ziraat',
  'vakifbank',
  'halkbank',
]);

// ---------------------------------------------------------------------------
// Text-based bank detection fingerprints
// ---------------------------------------------------------------------------

const BANK_FINGERPRINTS = [
  { bankId: 'yapikredi',     patterns: ['YAPI KREDİ', 'YAPIKREDI', 'WORLDCARD', 'WORLD CARD'] },
  { bankId: 'garantibbva',   patterns: ['GARANTİ BBVA', 'GARANTI BBVA', 'BONUS TRINK', 'GARANTIBBVA'] },
  { bankId: 'isbank',        patterns: ['İŞ BANKASI', 'IS BANKASI', 'MAXIMUM', 'MAXIMILES', 'İŞCEP'] },
  { bankId: 'akbank',        patterns: ['AKBANK', 'AXESS'] },
  { bankId: 'qnbfinansbank', patterns: ['QNB FİNANSBANK', 'CARDFINANS', 'QNB FINANSBANK', 'FINANSBANK'] },
  { bankId: 'enpara',        patterns: ['ENPARA'] },
  { bankId: 'denizbank',     patterns: ['DENİZBANK', 'DENIZBANK'] },
  { bankId: 'ziraat',        patterns: ['ZİRAAT', 'ZIRAAT', 'BANKKART'] },
  { bankId: 'vakifbank',     patterns: ['VAKIFBANK', 'VAKIF BANK', 'VAKIFLAR'] },
  { bankId: 'halkbank',      patterns: ['HALKBANK', 'PARAF'] },
  { bankId: 'ing',           patterns: ['ING BANK', 'ING TÜRKİYE', 'ING TURKIYE'] },
  { bankId: 'hsbc',          patterns: ['HSBC BANK', 'HSBC TÜRKİYE'] },
  { bankId: 'teb',           patterns: ['TÜRK EKONOMİ BANKASI', 'TURK EKONOMI', 'CEPTETEB', ' TEB '] },
  { bankId: 'sekerbank',     patterns: ['ŞEKERBANK', 'SEKERBANK', 'ŞEKER BONUS', 'SEKER BONUS'] },
  { bankId: 'odeabank',      patterns: ['ODEABANK', 'ODEA BANK', "BANK'O", 'BANKO CARD'] },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a PDF buffer using the appropriate bank parser.
 * 
 * @param {Buffer} pdfBuffer  - Raw PDF file buffer
 * @param {string} bankId     - Bank identifier (from banks.js BANK_REGISTRY)
 * @param {Object} [options]  - Optional: { tckn?: string } for encrypted PDFs
 * @returns {Promise<ParsedStatement>}
 */
async function parseStatement(pdfBuffer, bankId, options = {}) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    return _errorStatement(bankId || 'unknown', 'Geçersiz PDF tamponu');
  }

  let resolvedBankId = bankId;
  if (!resolvedBankId) {
    resolvedBankId = await detectBankFromPdf(pdfBuffer);
  }

  if (!resolvedBankId || !PARSER_MAP[resolvedBankId]) {
    return _errorStatement(resolvedBankId || 'unknown', `Desteklenmeyen banka: ${resolvedBankId}`);
  }

  const ParserClass = PARSER_MAP[resolvedBankId];
  const parser = new ParserClass(pdfBuffer);

  try {
    const result = await parser.parse();
    return result;
  } catch (err) {
    return _errorStatement(resolvedBankId, `Parser hatası: ${err.message}`);
  }
}

/**
 * Attempt to detect which bank's PDF this is by scanning text content.
 * 
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string|null>} bankId or null if undetectable
 */
async function detectBankFromPdf(pdfBuffer) {
  let rawText = '';

  try {
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(pdfBuffer);
    rawText = (data.text || '').toUpperCase();
  } catch {
    return null;
  }

  if (!rawText.trim()) return null;

  for (const { bankId, patterns } of BANK_FINGERPRINTS) {
    for (const pattern of patterns) {
      if (rawText.includes(pattern.toUpperCase())) {
        return bankId;
      }
    }
  }

  return null;
}

/**
 * Check whether a bank's statements are TCKN-encrypted.
 * 
 * @param {string} bankId
 * @returns {boolean}
 */
function isBankEncrypted(bankId) {
  return TCKN_ENCRYPTED_BANKS.has(bankId);
}

/**
 * Get parser support status for all 15 banks.
 * 
 * @returns {Array<BankSupportEntry>}
 */
function getSupportedBanksList() {
  return BANK_REGISTRY.map(bank => ({
    bankId: bank.bankId,
    bankName: bank.bankName,
    shortName: bank.shortName,
    brandColor: bank.brandColor,
    supported: !!PARSER_MAP[bank.bankId],
    encrypted: bank.pdfPasswordProtected,
    encryptionHint: bank.pdfPasswordFormat,
    cardProducts: bank.cardProducts,
    confidence: bank.confidence,
  }));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _errorStatement(bankId, errorMessage) {
  return {
    bankId,
    cardLastFour: 'XXXX',
    cardProduct: 'Bilinmiyor',
    cardNetwork: 'Unknown',
    periodMonth: null,
    periodYear: null,
    statementDate: null,
    paymentDueDate: null,
    totalAmount: 0,
    minimumPayment: 0,
    previousBalance: 0,
    payments: 0,
    newSpending: 0,
    creditLimit: 0,
    transactions: [],
    parseSuccess: false,
    parseErrors: [errorMessage],
    requiresTCKN: false,
  };
}

export { parseStatement, detectBankFromPdf, isBankEncrypted, getSupportedBanksList };
