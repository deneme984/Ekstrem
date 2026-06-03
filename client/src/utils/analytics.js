/**
 * @fileoverview Analytics computation helpers for the Ekstrem dashboard.
 * Pure functions — no side effects, no storage access.
 * All functions handle null/undefined input and never throw.
 */

import { generateId } from './uuid.js';
import { mapCategory } from './categoryMapper.js';

// ─── Totals & Aggregates ──────────────────────────────────────────────────────

/**
 * Sums the current debt across all provided cards.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {number} Total debt in TRY, or 0 on invalid input
 *
 * @example
 * getTotalDebt([{ currentDebt: 5000 }, { currentDebt: 3200 }]);  // 8200
 */
export function getTotalDebt(cards) {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((sum, card) => {
    return sum + _toNum(card?.currentDebt);
  }, 0);
}

/**
 * Sums the total credit limit across all provided cards.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {number} Total credit limit in TRY
 */
export function getTotalCreditLimit(cards) {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((sum, card) => sum + _toNum(card?.creditLimit), 0);
}

/**
 * Sums the monthly payment load across all active installments.
 *
 * @param {import('./models.js').Installment[]|null|undefined} installments
 * @returns {number} Total monthly installment load in TRY
 *
 * @example
 * getTotalInstallmentLoad([{ monthlyAmount: 500 }, { monthlyAmount: 300 }]);  // 800
 */
export function getTotalInstallmentLoad(installments) {
  if (!Array.isArray(installments)) return 0;
  return installments
    .filter((i) => i && i.remainingInstallments > 0)
    .reduce((sum, i) => sum + _toNum(i.monthlyAmount), 0);
}

/**
 * Calculates the weighted average credit utilization across all cards.
 * Cards with no credit limit are excluded from the calculation.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {number} Utilization percentage (0–100), rounded to 1 decimal place
 *
 * @example
 * getAverageLimitUtilization([
 *   { creditLimit: 10000, currentDebt: 5000 },
 *   { creditLimit: 20000, currentDebt: 4000 }
 * ]);
 * // (5000 + 4000) / (10000 + 20000) * 100 = 30.0
 */
export function getAverageLimitUtilization(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return 0;

  let totalLimit = 0;
  let totalDebt = 0;

  for (const card of cards) {
    const limit = _toNum(card?.creditLimit);
    if (limit > 0) {
      totalLimit += limit;
      totalDebt += _toNum(card?.currentDebt);
    }
  }

  if (totalLimit === 0) return 0;
  return _round((totalDebt / totalLimit) * 100, 1);
}

/**
 * Calculates the minimum payment due across all cards.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {number} Total minimum payment in TRY
 */
export function getTotalMinimumPayment(cards) {
  if (!Array.isArray(cards)) return 0;
  return cards.reduce((sum, card) => sum + _toNum(card?.minimumPayment), 0);
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

/**
 * Calculates spending by category as amounts and percentages of total spending.
 * Only includes transactions with positive amounts (spending, not refunds).
 * Results are sorted by amount descending.
 *
 * @param {import('./models.js').Transaction[]|null|undefined} transactions
 * @returns {import('./models.js').CategoryBreakdown[]} Array of category breakdown objects
 *
 * @example
 * getCategoryBreakdown(transactions);
 * // [{ category: 'Market', amount: 3200, percentage: 40.5 }, ...]
 */
export function getCategoryBreakdown(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const totals = {};
  let grandTotal = 0;

  for (const tx of transactions) {
    if (!tx || _toNum(tx.amount) <= 0) continue;
    const category = tx.category || 'Diğer';
    const amount = _toNum(tx.amount);
    totals[category] = (totals[category] || 0) + amount;
    grandTotal += amount;
  }

  if (grandTotal === 0) return [];

  return Object.entries(totals)
    .map(([category, amount]) => ({
      category,
      amount: _round(amount, 2),
      percentage: _round((amount / grandTotal) * 100, 1)
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Monthly Spending Trend ───────────────────────────────────────────────────

/**
 * Builds a monthly spending trend from statements for the last N months.
 * Months with no statement data will have a total of 0.
 *
 * @param {import('./models.js').Statement[]|null|undefined} statements
 * @param {number} [months=6] - Number of months to include (most recent first)
 * @returns {import('./models.js').MonthlySpendingPoint[]} Array ordered oldest → newest
 *
 * @example
 * getMonthlySpendingTrend(statements, 3);
 * // [{ month: 4, year: 2026, total: 12000 }, { month: 5, year: 2026, total: 9500 }, ...]
 */
export function getMonthlySpendingTrend(statements, months = 6) {
  const count = (typeof months === 'number' && months > 0) ? Math.floor(months) : 6;

  if (!Array.isArray(statements)) {
    return _buildEmptyTrend(count);
  }

  // Build a lookup map keyed by "YYYY-MM"
  const lookup = {};
  for (const s of statements) {
    if (!s || !s.periodMonth || !s.periodYear) continue;
    const key = `${s.periodYear}-${String(s.periodMonth).padStart(2, '0')}`;
    lookup[key] = (lookup[key] || 0) + _toNum(s.newSpending || s.totalAmount);
  }

  const result = [];
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  for (let i = 0; i < count; i++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    result.unshift({ month, year, total: _round(lookup[key] || 0, 2) });

    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return result;
}

// ─── Next Payment Due ─────────────────────────────────────────────────────────

/**
 * Finds the card with the soonest upcoming payment due date.
 * Excludes cards with no paymentDueDate set.
 * If multiple cards are due on the same day, the one with the highest debt is returned.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {import('./models.js').NextPaymentDue|null} Soonest due payment or null
 *
 * @example
 * getNextPaymentDue(cards);
 * // { card: {...}, daysUntil: 3, amount: 4800 }
 */
export function getNextPaymentDue(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const today = _startOfDay(new Date()).getTime();

  const candidates = cards
    .filter((card) => card && card.paymentDueDate && card.currentDebt > 0)
    .map((card) => {
      const due = _startOfDay(new Date(card.paymentDueDate)).getTime();
      const daysUntil = Math.round((due - today) / 86_400_000);
      return { card, daysUntil, amount: _toNum(card.currentDebt) };
    })
    .filter(({ daysUntil }) => daysUntil >= 0) // only future or today
    .sort((a, b) => a.daysUntil - b.daysUntil || b.amount - a.amount);

  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Returns ALL upcoming payment dues sorted by date ascending, then by amount descending.
 *
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {import('./models.js').NextPaymentDue[]}
 */
export function getAllUpcomingPayments(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  const today = _startOfDay(new Date()).getTime();

  return cards
    .filter((card) => card && card.paymentDueDate && card.currentDebt > 0)
    .map((card) => {
      const due = _startOfDay(new Date(card.paymentDueDate)).getTime();
      const daysUntil = Math.round((due - today) / 86_400_000);
      return { card, daysUntil, amount: _toNum(card.currentDebt) };
    })
    .filter(({ daysUntil }) => daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil || b.amount - a.amount);
}

// ─── Recurring Payment Detection ──────────────────────────────────────────────

/**
 * Detects recurring payments from a list of transactions.
 * A transaction is considered recurring if a merchant appears in at least
 * MIN_OCCURRENCES months with a similar amount (within AMOUNT_TOLERANCE).
 *
 * @param {import('./models.js').Transaction[]|null|undefined} transactions
 * @returns {import('./models.js').RecurringPayment[]} Detected recurring payment objects
 */
export function detectRecurringPayments(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const MIN_OCCURRENCES = 2;
  const AMOUNT_TOLERANCE = 0.15; // 15% variance allowed

  // Group transactions by merchant name (normalized)
  const byMerchant = {};
  for (const tx of transactions) {
    if (!tx || _toNum(tx.amount) <= 0) continue;
    const key = _normalizeMerchant(tx.merchantName || tx.description);
    if (!key) continue;
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push(tx);
  }

  const recurring = [];

  for (const [merchantKey, txList] of Object.entries(byMerchant)) {
    if (txList.length < MIN_OCCURRENCES) continue;

    // Check if amounts are consistently similar
    const amounts = txList.map((t) => _toNum(t.amount));
    const medianAmount = _median(amounts);
    const allSimilar = amounts.every(
      (a) => Math.abs(a - medianAmount) / medianAmount <= AMOUNT_TOLERANCE
    );

    if (!allSimilar) continue;

    // Check if transactions span multiple months
    const months = new Set(
      txList.map((t) => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    if (months.size < MIN_OCCURRENCES) continue;

    const sortedDates = txList
      .map((t) => t.date)
      .filter(Boolean)
      .sort();

    const latestTx = txList[txList.length - 1];

    recurring.push({
      id: generateId(),
      cardId: txList[0].cardId || '',
      merchantName: latestTx.merchantName || merchantKey,
      amount: _round(medianAmount, 2),
      previousAmount: null,
      frequency: _inferFrequency(txList),
      dayOfMonth: _inferDayOfMonth(txList),
      category: latestTx.category || mapCategory(latestTx.merchantName || ''),
      isActive: true,
      detectedSince: sortedDates[0] || new Date().toISOString(),
      lastSeen: sortedDates[sortedDates.length - 1] || new Date().toISOString()
    });
  }

  return recurring;
}

// ─── Price Change Detection ───────────────────────────────────────────────────

/**
 * Detects price changes in recurring payments.
 * Compares the current amount with previousAmount to find significant changes.
 *
 * @param {import('./models.js').RecurringPayment[]|null|undefined} recurringPayments
 * @param {number} [minChangePercent=5] - Minimum percentage change to report
 * @returns {import('./models.js').PriceChange[]} Array of price change objects
 *
 * @example
 * detectPriceChanges(recurring);
 * // [{ payment: {...}, oldAmount: 49.99, newAmount: 59.99, changePercent: 20 }]
 */
export function detectPriceChanges(recurringPayments, minChangePercent = 5) {
  if (!Array.isArray(recurringPayments)) return [];

  const changes = [];

  for (const payment of recurringPayments) {
    if (!payment || payment.previousAmount == null) continue;
    const oldAmount = _toNum(payment.previousAmount);
    const newAmount = _toNum(payment.amount);
    if (oldAmount === 0) continue;

    const changePercent = ((newAmount - oldAmount) / oldAmount) * 100;
    if (Math.abs(changePercent) >= minChangePercent) {
      changes.push({
        payment,
        oldAmount: _round(oldAmount, 2),
        newAmount: _round(newAmount, 2),
        changePercent: _round(changePercent, 1)
      });
    }
  }

  return changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// ─── Per-card Summaries ───────────────────────────────────────────────────────

/**
 * Returns a per-card spending summary for a given set of transactions.
 *
 * @param {import('./models.js').Transaction[]|null|undefined} transactions
 * @param {import('./models.js').Card[]|null|undefined} cards
 * @returns {Array<{ cardId: string, cardName: string, total: number }>}
 */
export function getSpendingByCard(transactions, cards) {
  if (!Array.isArray(transactions) || !Array.isArray(cards)) return [];

  const cardMap = {};
  for (const card of cards) {
    if (card && card.id) cardMap[card.id] = card;
  }

  const totals = {};
  for (const tx of transactions) {
    if (!tx || _toNum(tx.amount) <= 0 || !tx.cardId) continue;
    totals[tx.cardId] = (totals[tx.cardId] || 0) + _toNum(tx.amount);
  }

  return Object.entries(totals)
    .map(([cardId, total]) => ({
      cardId,
      cardName: cardMap[cardId]
        ? `${cardMap[cardId].bankName} ${cardMap[cardId].cardName}`
        : cardId,
      total: _round(total, 2)
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Calculates the credit utilization percentage for a single card.
 *
 * @param {import('./models.js').Card|null|undefined} card
 * @returns {number} Utilization percentage 0–100
 */
export function getCardUtilization(card) {
  if (!card || _toNum(card.creditLimit) === 0) return 0;
  return _round((_toNum(card.currentDebt) / _toNum(card.creditLimit)) * 100, 1);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Converts a value to a safe finite number.
 * @param {*} value
 * @returns {number}
 * @private
 */
function _toNum(value) {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n : 0;
}

/**
 * Rounds a number to the specified decimal places.
 * @param {number} n
 * @param {number} decimals
 * @returns {number}
 * @private
 */
function _round(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Returns the median value of a number array.
 * @param {number[]} arr
 * @returns {number}
 * @private
 */
function _median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Normalizes a merchant name for grouping (lowercase, trim, collapse spaces).
 * @param {string} name
 * @returns {string}
 * @private
 */
function _normalizeMerchant(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Infers the billing frequency of a recurring payment based on transaction intervals.
 * @param {import('./models.js').Transaction[]} txList
 * @returns {'monthly'|'yearly'|'quarterly'}
 * @private
 */
function _inferFrequency(txList) {
  if (txList.length < 2) return 'monthly';

  const dates = txList
    .map((t) => new Date(t.date).getTime())
    .filter((d) => isFinite(d))
    .sort((a, b) => a - b);

  if (dates.length < 2) return 'monthly';

  // Calculate average interval in days
  let totalGap = 0;
  for (let i = 1; i < dates.length; i++) {
    totalGap += (dates[i] - dates[i - 1]) / 86_400_000;
  }
  const avgDays = totalGap / (dates.length - 1);

  if (avgDays >= 300) return 'yearly';
  if (avgDays >= 75) return 'quarterly';
  return 'monthly';
}

/**
 * Infers the typical day of month for a recurring payment.
 * @param {import('./models.js').Transaction[]} txList
 * @returns {number} Day of month (1–31)
 * @private
 */
function _inferDayOfMonth(txList) {
  const days = txList
    .map((t) => new Date(t.date).getDate())
    .filter((d) => d >= 1 && d <= 31);

  if (days.length === 0) return 1;
  return Math.round(days.reduce((s, d) => s + d, 0) / days.length);
}

/**
 * Returns a Date set to midnight local time.
 * @param {Date} date
 * @returns {Date}
 * @private
 */
function _startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Builds an empty monthly trend array for N months (all totals = 0).
 * @param {number} count
 * @returns {import('./models.js').MonthlySpendingPoint[]}
 * @private
 */
function _buildEmptyTrend(count) {
  const result = [];
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  for (let i = 0; i < count; i++) {
    result.unshift({ month, year, total: 0 });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return result;
}
