/**
 * Odeabank — PDF Statement Parser
 * 
 * Card products: Bank'O Card, Bank'O Card Platinum, Bank'O Card Gold, Bank'O Business
 * PDF: NOT password protected
 * Transaction table: Tarih | Açıklama | Tutar
 * Installments: "X/Y Taksit" in açıklama
 * Statement header: "KREDİ KARTI HESAP ÖZETİ — ODEABANK"
 * Note: Turkish subsidiary of Bank Audi (Lebanon); similar format to other mid-size banks
 */

import BaseParser from '../baseParser.js';

class OdeabankParser extends BaseParser {
  constructor(pdfBuffer) {
    super(pdfBuffer, 'odeabank');
  }

  async parse() {
    await this.extractText();

    if (this.rawText.trim().length < 100) {
      return {
        ...this.defaultStatement(),
        parseErrors: ['PDF okunamadı veya boş'],
        parseSuccess: false,
      };
    }

    const period = this.extractPeriod();
    const cardLastFour = this.extractCardLastFour();
    const cardProduct = this._extractCardProduct();
    const cardNetwork = this.extractCardNetwork();

    const totalAmount = this._extractAmount(/[Dd][öo]nem\s+[Bb]orcu[\s:]+([0-9.,]+(?:\s*TL)?)/);
    const minimumPayment = this._extractAmount(/[Aa]sgari\s+[öo]deme[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const previousBalance = this._extractAmount(/[öo]nceki\s+[Dd][öo]nem[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const payments = this._extractAmount(/[öo]deme(?:ler)?[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const newSpending = this._extractAmount(/[Yy]eni\s+[Hh]arcama(?:lar)?[\s:]+([0-9.,]+(?:\s*TL)?)/i);
    const creditLimit = this._extractAmount(/[Kk]redi\s+[Ll]imit[i]?[\s:]+([0-9.,]+(?:\s*TL)?)/i);

    const statementDate = this._extractDate(/[Hh]esap\s+[öo]zeti\s+[Tt]arihi[\s:]+(\d{1,2}[.\/]\d{1,2}[.\/]\d{4})/);
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
    // Note: apostrophe in "Bank'O" may be stripped by pdf-parse
    if (this.rawText.includes('Bank\'O Platinum') || this.rawText.includes('BankO Platinum') || this.rawText.includes("Bank'O Card Platinum")) return "Bank'O Card Platinum";
    if (this.rawText.includes('Bank\'O Gold') || this.rawText.includes('BankO Gold') || this.rawText.includes("Bank'O Card Gold")) return "Bank'O Card Gold";
    if (this.rawText.includes('Bank\'O Business') || this.rawText.includes('BankO Business')) return "Bank'O Business";
    return "Bank'O Card";
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
    // Odeabank: Tarih | Açıklama | Tutar (3 columns, simple)
    const sectionStart = this.rawText.search(/TAR[İI]H\s+A[ÇC][İI]KLAMA|[İI][ŞS]LEM\s+TAR[İI]H[İI]/i);
    const workText = sectionStart > 0 ? this.rawText.slice(sectionStart) : this.rawText;

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
        rawDesc.replace(/\d+\/\d+\s*[Tt]aksit/g, '').trim()
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
    const keywords = ['dönem borcu', 'asgari', 'toplam', 'limit', 'faiz', 'önceki'];
    const lower = desc.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }
}

export default OdeabankParser;
