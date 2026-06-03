/**
 * QNB Finansbank — PDF Statement Parser
 * 
 * Card products: CardFinans, CardFinans Platinum, CardFinans Gold, Pegasus BolBol
 * PDF: NOT password protected
 * Transaction table: Tarih | Açıklama | Taksit Bilgisi | Tutar
 * Installments: "X/Y" in dedicated taksit column
 * Statement header: "HESAP ÖZETİ" with CardFinans logo
 */

import BaseParser from '../baseParser.js';

class QNBFinansbankParser extends BaseParser {
  constructor(pdfBuffer) {
    super(pdfBuffer, 'qnbfinansbank');
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
    const minimumPayment = this._extractAmount(/[Aa]sgari\s+[öo]deme\s+[Tt]utar[ıi][\s:]+([0-9.,]+(?:\s*TL)?)/i);
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
    if (this.rawText.includes('Pegasus') && this.rawText.includes('BolBol')) return 'Pegasus BolBol';
    if (this.rawText.includes('CardFinans Platinum')) return 'CardFinans Platinum';
    if (this.rawText.includes('CardFinans Gold')) return 'CardFinans Gold';
    if (this.rawText.includes('QNB Business')) return 'QNB Business Card';
    return 'CardFinans';
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

    // QNB Finansbank: DD.MM.YYYY  MERCHANT  [X/Y]  AMOUNT
    const txPattern = /(\d{2}[.\/]\d{2}[.\/]\d{4})\s+(.+?)\s+(?:(\d+\/\d+)\s+)?([-]?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*(?:TL|₺))?(?:\s*[-])?)/gm;
    let match;

    while ((match = txPattern.exec(workText)) !== null) {
      const date = this.parseTurkishDate(match[1]);
      const rawDesc = match[2].trim();
      const taksitStr = match[3] || '';
      const amountStr = match[4].trim();
      const amount = this.parseTurkishAmount(amountStr);

      if (this._isSummaryRow(rawDesc)) continue;

      const installmentText = taksitStr ? `${taksitStr} Taksit` : rawDesc;
      const installment = this.parseInstallmentInfo(installmentText);

      transactions.push({
        date,
        description: this.cleanMerchantName(rawDesc),
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
    const keywords = ['dönem borcu', 'asgari', 'toplam', 'limit', 'faiz', 'bolbol', 'önceki'];
    const lower = desc.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }
}

export default QNBFinansbankParser;
