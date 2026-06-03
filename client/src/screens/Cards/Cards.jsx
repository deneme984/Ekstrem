import { useState, useMemo, useCallback } from 'react';
import './Cards.css';

import CardCarousel from '../../components/CardCarousel/CardCarousel.jsx';
import ProgressRing from '../../components/ProgressRing/ProgressRing.jsx';
import TransactionItem from '../../components/TransactionItem/TransactionItem.jsx';

import { useCards } from '../../hooks/useCards.js';
import { useStatements } from '../../hooks/useStatements.js';
import { formatTRY } from '../../utils/formatCurrency.js';
import {
  formatShortDate,
  getDaysUntil,
  formatTurkishDate,
} from '../../utils/dateUtils.js';

// ── Skeleton loading row ──────────────────────────────────────────
function SkeletonTxItem() {
  return (
    <div className="cards-skeleton-item">
      <div className="cards-skeleton-icon skeleton" />
      <div className="cards-skeleton-lines">
        <div className="cards-skeleton-line skeleton" />
        <div className="cards-skeleton-line cards-skeleton-line--short skeleton" />
      </div>
    </div>
  );
}

// ── Due-date urgency helper ───────────────────────────────────────
function getDueBadgeClass(daysUntil) {
  if (daysUntil < 0)  return 'cards-due-badge--urgent'; // overdue
  if (daysUntil <= 7) return 'cards-due-badge--urgent';
  if (daysUntil <= 14) return 'cards-due-badge--normal';
  return 'cards-due-badge--ok';
}

function getDueLabel(daysUntil) {
  if (daysUntil < 0)  return `${Math.abs(daysUntil)} gün geçti`;
  if (daysUntil === 0) return 'Bugün son!';
  if (daysUntil === 1) return 'Yarın son gün';
  return `${daysUntil} gün kaldı`;
}

// ── Empty screen (no cards) ───────────────────────────────────────
function EmptyCardsScreen({ onNavigateDashboard }) {
  return (
    <div className="cards-empty-screen animate-fade-in-up">
      {/* CSS-only illustration */}
      <div className="cards-empty-illustration" aria-hidden="true">
        <div className="cards-empty-card cards-empty-card--back" />
        <div className="cards-empty-card cards-empty-card--front">
          <span className="cards-empty-card-plus">+</span>
        </div>
      </div>

      <h2 className="cards-empty-title">Henüz kart eklenmedi</h2>
      <p className="cards-empty-sub">
        Gmail ile giriş yaparak ekstrelerinizi tarayın ve kartlarınızı otomatik ekleyin.
      </p>

      <button
        className="cards-empty-btn press-feedback"
        onClick={onNavigateDashboard}
      >
        <span>📤</span>
        <span>Ekstre Yükle</span>
      </button>
    </div>
  );
}

// ── Main Cards screen ─────────────────────────────────────────────
export default function Cards() {
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const { cards, isLoading: cardsLoading } = useCards();
  const {
    isLoading: statementsLoading,
    statements,
    getTransactionsByCard,
    getActiveInstallments,
  } = useStatements();

  const isLoading = cardsLoading || statementsLoading;

  // ── Active card data ────────────────────────────────────────────
  const activeCard = cards[activeCardIndex] || null;

  const cardTransactions = useMemo(() => {
    if (!activeCard) return [];
    return getTransactionsByCard(activeCard.id)
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [activeCard, getTransactionsByCard]);

  // Active card's latest statement (for balance / due date)
  const latestStatement = useMemo(() => {
    if (!activeCard || !statements.length) return null;
    const cardStatements = statements
      .filter((s) => s.cardId === activeCard.id)
      .sort((a, b) => {
        if (b.periodYear !== a.periodYear) return b.periodYear - a.periodYear;
        return b.periodMonth - a.periodMonth;
      });
    return cardStatements[0] || null;
  }, [activeCard, statements]);

  // Upcoming payments = statements with future paymentDueDate
  const upcomingPaymentsCount = useMemo(() => {
    if (!activeCard) return 0;
    return statements.filter(
      (s) => s.cardId === activeCard.id && getDaysUntil(s.paymentDueDate) >= 0
    ).length;
  }, [activeCard, statements]);

  // Active installments for this card
  const activeInstallments = useMemo(() => {
    if (!activeCard) return [];
    return getActiveInstallments().filter((i) => i.cardId === activeCard.id);
  }, [activeCard, getActiveInstallments]);

  // Statement closing date chip
  const statementDate = latestStatement?.statementDate;
  const statementDateLabel = statementDate ? formatShortDate(statementDate) : '—';

  // Limit utilization
  const periodDebt   = latestStatement?.totalAmount ?? activeCard?.balance ?? 0;
  const creditLimit  = activeCard?.limit ?? 0;
  const utilization  = creditLimit > 0 ? Math.round((periodDebt / creditLimit) * 100) : 0;

  // Due date
  const dueDate      = latestStatement?.paymentDueDate;
  const daysUntilDue = dueDate ? getDaysUntil(dueDate) : null;

  const handleCardChange = useCallback((index) => {
    setActiveCardIndex(index);
  }, []);

  const handleNavigateDashboard = useCallback(() => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // ── No cards: empty state ───────────────────────────────────────
  if (!isLoading && !cards.length) {
    return (
      <div className="cards-screen">
        <header className="cards-header">
          <h1 className="cards-header-title">Kartlarım</h1>
          <div className="cards-header-icon">💳</div>
        </header>
        <EmptyCardsScreen onNavigateDashboard={handleNavigateDashboard} />
      </div>
    );
  }

  return (
    <div className="cards-screen">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="cards-header">
        <h1 className="cards-header-title">Kartlarım</h1>
        <button className="cards-header-icon" aria-label="Ayarlar">
          ⚙️
        </button>
      </header>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="cards-content">
        {/* Carousel */}
        <CardCarousel
          cards={cards}
          activeIndex={activeCardIndex}
          onCardChange={handleCardChange}
        />

        {/* Detail section — only when card available */}
        {activeCard && (
          <div className="cards-detail" key={activeCard.id}>
            {/* Kart Detayı button */}
            <button className="cards-detail-btn press-feedback">
              <span>📋</span>
              <span>Kart Detayı</span>
            </button>

            {/* Balance + Progress Ring */}
            <div className="cards-balance-row">
              <div className="cards-balance-left">
                <span className="cards-balance-label">Dönem Borcu</span>
                <span className="cards-balance-amount">
                  {formatTRY(periodDebt)}
                </span>
                {creditLimit > 0 && (
                  <span className="cards-balance-limit">
                    Limit: {formatTRY(creditLimit)}
                  </span>
                )}
              </div>

              {creditLimit > 0 && (
                <ProgressRing
                  percentage={utilization}
                  size={72}
                  strokeWidth={6}
                  label="limit"
                />
              )}
            </div>

            {/* Due date badge */}
            {dueDate && daysUntilDue !== null && (
              <div className={`cards-due-badge ${getDueBadgeClass(daysUntilDue)}`}>
                <span>📅</span>
                <span>
                  Son Ödeme: {formatTurkishDate(dueDate)} · {getDueLabel(daysUntilDue)}
                </span>
              </div>
            )}

            {/* Quick stat chips */}
            <div className="cards-chips">
              <div className="cards-chip">
                <span className="cards-chip-value">{upcomingPaymentsCount}</span>
                <span className="cards-chip-label">Yaklaşan Ödeme</span>
              </div>
              <div className="cards-chip">
                <span className="cards-chip-value">{statementDateLabel}</span>
                <span className="cards-chip-label">Hesap Kesim</span>
              </div>
              <div className="cards-chip">
                <span className="cards-chip-value">{activeInstallments.length}</span>
                <span className="cards-chip-label">Taksit Aktif</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Son İşlemler ─────────────────────────────────────── */}
        <div className="cards-transactions">
          <div className="cards-section-header">
            <h2 className="cards-section-title">Son İşlemler</h2>
            <button className="cards-section-link" aria-label="Tüm işlemleri gör">
              Tümünü Gör ›
            </button>
          </div>

          <div className="cards-tx-list">
            {isLoading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTxItem key={i} />
              ))
            ) : cardTransactions.length > 0 ? (
              // Real transactions
              <div className="stagger-children">
                {cardTransactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))}
              </div>
            ) : (
              // Empty state
              <div className="cards-tx-empty">
                <div className="cards-tx-empty-icon">🧾</div>
                <div>Bu kart için henüz işlem bulunamadı</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom padding for nav bar */}
        <div className="cards-bottom-pad" />
      </div>
    </div>
  );
}
