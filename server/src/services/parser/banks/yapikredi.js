/**
 * Yapı Kredi Bankası — PDF Statement Parser
 * 
 * Card products: Worldcard, World Gold, World Platinum, World Eko, Adios, Play, Crystal
 * PDF: NOT password protected
 * Transaction table: Tarih | İşyeri | Tutar | X/Y Taksit
 * Installments: "X/Y Taksit" in description
 * Statement header: "HESAP ÖZETİ"
 */

import BaseParser from '../baseParser.js';

class YapiKrediParser extends BaseParser {
  constructor(pdfBuffer) {
    super(pdfBuffer, 'yapikredi');
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
    const previousBalance = this._extractAmount(/[Gg]e[çc]en\s+[Dd][öo]nem[\s:]+([0-9.,]+(?:\s*TL)?)/i);
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
    const products = [
      'World Platinum', 'World Gold', 'World Eko', 'Worldcard',
      'Adios Premium', 'Adios', 'Play', 'Crystal', 'Hepsiburada', 'Opet',
    ];
    for (const p of products) {
      if (this.rawText.includes(p)) return p;
    }
    return 'Worldcard';
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
    // Yapı Kredi: Tarih | İşyeri Adı | Tutar [| X/Y Taksit]
    const sectionStart = this.rawText.search(/[İI][ŞS]LEM\s+TAR[İI]H[İI]|TAR[İI]H\s+A[ÇC][İI]KLAMA/i);
    const workText = sectionStart > 0 ? this.rawText.slice(sectionStart) : this.rawText;

    const txPattern = /(\d{2}[.\/]\d{2}[.\/]\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*(?:TL|₺))?(?:\s*[-])?)/gm;
    let match;

    while ((match = txPattern.exec(workText)) !== null) {
      const date = this.parseTurkishDate(match[1]);
      const rawDesc = match[2].trim();
      const amountStr = match[3].trim();
      const amount = this.parseTurkishAmount(amountStr);
      const installment = this.parseInstallmentInfo(rawDesc);

      if (this._isSummaryRow(rawDesc)) continue;

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
    const keywords = ['dönem borcu', 'asgari ödeme', 'önceki dönem', 'toplam', 'limit', 'nakit', 'faiz'];
    const lower = desc.toLowerCase();
    return keywords.some(kw => lower.includes(kw));
  }
}

export default YapiKrediParser;
