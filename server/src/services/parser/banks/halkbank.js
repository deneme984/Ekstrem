/**
 * Halkbank — PDF Statement Parser
 * 
 * Card products: Paraf, Paraf Gold, Paraf Platinum, Paraf Business, Diners Club
 * PDF: PASSWORD PROTECTED with TCKN (11 digits)
 * Transaction table: Tarih | Açıklama | Tutar | Paraf Puan
 * Installments: "X. Taksit (Y Taksit)" in açıklama
 * Statement header: "PARAF KREDİ KARTI HESAP ÖZETİ"
 */

import BaseParser from '../baseParser.js';

class HalkbankParser extends BaseParser {
  constructor(pdfBuffer) {
    super(pdfBuffer, 'halkbank');
  }

  async parse() {
    await this.extractText();

    // Halkbank PDFs are TCKN-encrypted
    if (this.rawText.trim().length < 100) {
      return {
        ...this.defaultStatement(),
        parseErrors: ['PDF şifreli - T.C. Kimlik Numarası gerekli'],
        requiresTCKN: true,
        parseSuccess: false,
      };
    }

    const period = this.extractPeriod();
    const cardLastFour = this.extractCardLastFour();
    const cardProduct = this._extractCardProduct();
    const cardNetwork = this.extractCardNetwork();

    const totalAmount = this._extractAmount(/[Dd][öo]nem\s+[Bb]orcu[\s:]+([0-9.,]+(?:\s*TL)?)/);
    const minimumPayment = this._extractAmount(/[Aa]sgari\s+[öo]deme[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const previousBalance = this._extractAmount(/[öo]nceki\s+[Dd][öo]nem\s+[Bb]orcu[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const payments = this._extractAmount(/[öo]deme(?:ler)?[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const newSpending = this._extractAmount(/[Yy]eni\s+[Hh]arcama(?:lar)?[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const creditLimit = this._extractAmount(/[Kk]redi\s+[Ll]imit[i]?[\s:]+([0-9.,]+(?:\s*TL)?)/i);

    const statementDate = this._extractDate(/[Hh]esap\s+[Kk]esim\s+[Tt]arihi[\s:]+(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/);
    const paymentDueDate = this._extractDate(/[Ss]on\s+[öo]deme\s+[Tt]arihi[\s:]+(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/);

    const transactions = this.parseTransactions();

    return {
      bankId: this.bankId,
      cardLastFour,
      cardProduct,
      cardNetwork,
      periodMonth: period.periodMonth,
      periodYear: period.periodYear,
      statementDate,
      paymentDueDate,
      totalAmount,
      minimumPayment,
      previousBalance,
      payments,
      newSpending,
      creditLimit,
      transactions,
      parseSuccess: true,
      parseErrors: this.parseErrors,
      requiresTCKN: false,
    };
  }

  _extractCardProduct() {
    if (this.rawText.includes('Diners Club') || this.rawText.includes('Diners')) return 'Diners Club';
    if (this.rawText.includes('Paraf Platinum')) return 'Paraf Platinum';
    if (this.rawText.includes('Paraf Gold')) return 'Paraf Gold';
    if (this.rawText.includes('Paraf Business')) return 'Paraf Business';
    return 'Paraf';
  }

  _extractAmount(pattern) {
    const match = this.rawText.match(pattern);
    if (!match) return 0;
    return this.parseTurkishAmount(match[1]);
  }

  _extractDate(pattern) {
    const match = this.rawText.match(pattern);
    if (!match) return null;
    return this.parseTurkishDate(match[1]);
  }

  parseTransactions() {
    const transactions = [];
    const sectionStart = this.rawText.search(/TAR[İI]H\s+A[ÇC][İI]KLAMA|[İI][ŞS]LEM\s+TAR[İI]H[İI]/i);
    const workText = sectionStart > 0 ? this.rawText.slice(sectionStart) : this.rawText;

    // Halkbank: DD.MM.YYYY  DESCRIPTION  AMOUNT  [PARAF_POINTS]
    // Installment: "X. Taksit (Y Taksit)" in description
    const txPattern = /(\d{2}[.\/]\d{2}[.\/]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*(?:TL|₺))?(?:\s*[-])?)/gm;
    let match;

    while ((match = txPattern.exec(workText)) !== null) {
      const date = this.parseTurkishDate(match[1]);
      const rawDesc = match[2].trim();
      const amountStr = match[3].trim();
      const amount = this.parseTurkishAmount(amountStr);

      if (this._isSummaryRow(rawDesc)) continue;

      const installment = this.parseInstallmentInfo(rawDesc);
      const description = this.cleanMerchantName(
        rawDesc
          .replace(/\d+\.\s*[Tt]aksit\s*[\(\-]\s*\d+\s*[Tt]aksit\s*\)?/g, '')
          .replace(/\d+\/\d+\s*[Tt]aksit/g, '')
          .trim()
      );

      transactions.push({
        date,
        description,
        amount,
        currency: 'TRY',
        isInstallment: installment.isInstallment,
        installmentCurrent: installment.current,
        installmentTotal: installment.total,
      });
    }

    return transactions;
  }

  _isSummaryRow(desc) {
    const keywords = ['dönem borcu', 'asgari', 'toplam', 'limit', 'faiz', 'paraf puan', 'önceki'];
    const lower = desc.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }
}

export default HalkbankParser;
