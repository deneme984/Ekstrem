/**
 * BaseParser — Shared utilities for all Turkish bank PDF parsers
 * 
 * All bank-specific parsers extend this class and implement parse().
 */

import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const TURKISH_MONTHS_MAP = {
  'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'haziran': 6,
  'temmuz': 7, 'ağustos': 8, 'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12,
  'subat': 2, 'mayis': 5, 'agustos': 8, 'eylul': 9, 'kasim': 11, 'aralik': 12,
};

class BaseParser {
  constructor(pdfBuffer, bankId) {
    this.pdfBuffer = pdfBuffer;
    this.bankId = bankId;
    this.rawText = '';
    this.lines = [];
    this.parseErrors = [];
  }

  /**
   * Extract raw text from PDF buffer using pdf-parse.
   * Sets this.rawText and this.lines.
   */
  async extractText() {
    try {
      const data = await pdfParse(this.pdfBuffer);
      this.rawText = data.text || '';
      this.lines = this.splitIntoLines(this.rawText);
    } catch (err) {
      if (err.message && (
        err.message.includes('encrypted') ||
        err.message.includes('password') ||
        err.message.includes('Bad XRef') ||
        err.message.includes('PDF') ||
        err.message.includes('stream')
      )) {
        this.rawText = '';
        this.lines = [];
        this.parseErrors.push(`PDF şifreli: ${err.message}`);
      } else {
        this.rawText = '';
        this.lines = [];
        this.parseErrors.push(`PDF okuma hatası: ${err.message}`);
      }
    }
  }

  /**
   * Parse Turkish currency string to a JavaScript number.
   * "1.234,56 TL" → 1234.56
   * "1.234,56"    → 1234.56
   * "- 1.234,56"  → -1234.56
   * "1.234,56-"   → -1234.56 (trailing minus — common in Turkish bank PDFs)
   */
  parseTurkishAmount(str) {
    if (!str || typeof str !== 'string') return 0;

    let s = str.trim();
    let negative = false;

    // Leading minus
    if (s.startsWith('-') || s.startsWith('- ')) {
      negative = true;
      s = s.replace(/^-\s*/, '');
    }
    // Trailing minus (common in Turkish bank PDF tables)
    if (s.endsWith('-')) {
      negative = true;
      s = s.slice(0, -1).trim();
    }

    // Remove currency symbols
    s = s.replace(/TL|₺|EUR|USD|GBP|CHF/gi, '').trim();

    // Remove thousands separators (periods) and replace comma decimal separator with dot
    s = s.replace(/\./g, '').replace(',', '.');

    const value = parseFloat(s);
    if (isNaN(value)) return 0;
    return negative ? -value : value;
  }

  /**
   * Parse Turkish date string to ISO date string.
   * "24.05.2026"    → "2026-05-24"
   * "24/05/2026"    → "2026-05-24"
   * "24 Mayıs 2026" → "2026-05-24"
   * "24-05-2026"    → "2026-05-24"
   */
  parseTurkishDate(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim();

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const numericMatch = s.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
    if (numericMatch) {
      const day = numericMatch[1].padStart(2, '0');
      const month = numericMatch[2].padStart(2, '0');
      const year = numericMatch[3];
      return `${year}-${month}-${day}`;
    }

    // DD Month YYYY (Turkish month names)
    const textMatch = s.match(/^(\d{1,2})\s+([A-Za-zÀ-öø-ÿğüşıöçĞÜŞİÖÇ]+)\s+(\d{4})$/i);
    if (textMatch) {
      const day = textMatch[1].padStart(2, '0');
      const monthName = textMatch[2].toLowerCase();
      const year = textMatch[3];
      const monthNum = this._lookupTurkishMonth(monthName);
      if (monthNum) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${day}`;
      }
    }

    return null;
  }

  _lookupTurkishMonth(name) {
    const lower = name.toLowerCase();
    if (TURKISH_MONTHS_MAP[lower] !== undefined) return TURKISH_MONTHS_MAP[lower];
    // ASCII normalize
    const ascii = lower
      .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c');
    return TURKISH_MONTHS_MAP[ascii] || null;
  }

  /**
   * Detect installment info from a text string.
   * "3/12 Taksit"          → { isInstallment: true, current: 3, total: 12 }
   * "3. Taksit (12 Taksit)" → { isInstallment: true, current: 3, total: 12 }
   */
  parseInstallmentInfo(text) {
    if (!text || typeof text !== 'string') {
      return { isInstallment: false, current: null, total: null };
    }

    const patterns = [
      /(\d+)\s*\/\s*(\d+)\s*[Tt]aksit/,
      /[Tt][Aa][Kk][Ss][İiIi][Tt]\s+(\d+)\s*\/\s*(\d+)/,
      /(\d+)\.\s*[Tt]aksit\s*[\(\-\/]\s*(\d+)\s*[Tt]aksit/,
      /(\d+)\.\s*[Tt]aksit\s*\/\s*(\d+)/,
      /\b(\d+)\s*\/\s*(\d+)\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const current = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        if (current >= 1 && total >= 2 && current <= total && total <= 60) {
          return { isInstallment: true, current, total };
        }
      }
    }

    return { isInstallment: false, current: null, total: null };
  }

  /**
   * Clean and normalize a merchant name from raw PDF text.
   */
  cleanMerchantName(rawText) {
    if (!rawText) return '';
    return rawText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.,\-&'\/İÇŞĞÜÖıçşğüö]/gi, ' ')
      .trim()
      .slice(0, 100);
  }

  /**
   * Split PDF text into clean, non-empty lines.
   */
  splitIntoLines(text) {
    if (!text) return [];
    return text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }

  /**
   * Find the value that follows a label in lines array.
   */
  findValue(lines, label, searchRadius = 3) {
    const lowerLabel = label.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerLabel)) {
        const sameLine = lines[i].slice(lines[i].toLowerCase().indexOf(lowerLabel) + lowerLabel.length).trim();
        if (sameLine.length > 0) return sameLine;
        for (let j = i + 1; j <= i + searchRadius && j < lines.length; j++) {
          if (lines[j].length > 0) return lines[j];
        }
      }
    }
    return null;
  }

  /**
   * Extract the last 4 digits of a card number from raw text.
   */
  extractCardLastFour() {
    const fullCard = this.rawText.match(/\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-](\d{4})\b/);
    if (fullCard) return fullCard[1];

    const masked = this.rawText.match(/[*X]{4}[\s\-][*X]{4}[\s\-][*X]{4}[\s\-](\d{4})/i);
    if (masked) return masked[1];

    const afterLabel = this.rawText.match(/kart\s+(?:no\s*[:\-]?\s*)?[*\d\s]{8,}\s*(\d{4})/i);
    if (afterLabel) return afterLabel[1];

    return 'XXXX';
  }

  /**
   * Extract the card network (VISA, Mastercard, Troy, Amex).
   */
  extractCardNetwork() {
    const text = this.rawText.toUpperCase();
    if (text.includes('VISA') && text.includes('INFINITE')) return 'Visa Infinite';
    if (text.includes('VISA')) return 'Visa';
    if (text.includes('MASTERCARD') || text.includes('MASTER CARD')) return 'Mastercard';
    if (text.includes('TROY')) return 'Troy';
    if (text.includes('AMEX') || text.includes('AMERICAN EXPRESS')) return 'Amex';
    if (text.includes('DINERS')) return 'Diners Club';
    return 'Unknown';
  }

  /**
   * Extract period (month/year) from statement.
   */
  extractPeriod() {
    const donemMatch = this.rawText.match(/[Dd][öo]nem[:\s]+(\d{1,2})[\/\.\-](\d{4})/);
    if (donemMatch) {
      return { periodMonth: parseInt(donemMatch[1], 10), periodYear: parseInt(donemMatch[2], 10) };
    }

    const dateMatch = this.rawText.match(/(?:ekstre|hesap\s+[öo]zeti|d[öo]nem)\s+tarihi[:\s]+(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/i);
    if (dateMatch) {
      return { periodMonth: parseInt(dateMatch[2], 10), periodYear: parseInt(dateMatch[3], 10) };
    }

    const firstDate = this.rawText.match(/(\d{1,2})[.\/](\d{2})[.\/](\d{4})/);
    if (firstDate) {
      return { periodMonth: parseInt(firstDate[2], 10), periodYear: parseInt(firstDate[3], 10) };
    }

    const now = new Date();
    return { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() };
  }

  /**
   * Default parsed statement object.
   */
  defaultStatement() {
    return {
      bankId: this.bankId,
      cardLastFour: 'XXXX',
      cardProduct: 'Kredi Kartı',
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
      parseErrors: this.parseErrors,
      requiresTCKN: false,
    };
  }

  /**
   * Abstract method — must be implemented by each bank-specific parser.
   */
  async parse() {
    throw new Error('parse() must be implemented by bank-specific parser');
  }
}

export default BaseParser;
