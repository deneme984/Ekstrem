import { useMemo } from 'react';
import { Bell, CreditCard, RefreshCw, Shield } from 'lucide-react';

import { useCards } from '../../hooks/useCards';
import { useStatements } from '../../hooks/useStatements';
import {
  getTotalDebt,
  getTotalInstallmentLoad,
  getAverageLimitUtilization,
  getCategoryBreakdown,
  getNextPaymentDue,
  getAllUpcomingPayments,
} from '../../utils/analytics';
import { formatTRY } from '../../utils/formatCurrency';
import { getDaysUntil, formatTurkishDate } from '../../utils/dateUtils';

import PaymentCountdown from '../../components/PaymentCountdown/PaymentCountdown';
import MetricCard from '../../components/MetricCard/MetricCard';
import DonutChart from '../../components/DonutChart/DonutChart';
import InsightBanner from '../../components/InsightBanner/InsightBanner';
import UploadButton from '../../components/UploadButton/UploadButton';

import './Dashboard.css';

// ── Category colour mapping (matches CSS vars) ─────────────────────
const CATEGORY_COLORS = {
  market:   '#00C853',
  online:   '#007AFF',
  yemek:    '#FF9500',
  ulasim:   '#FF3B30',
  eglence:  '#AF52DE',
  saglik:   '#5AC8FA',
  giyim:    '#FF6B9D',
  diger:    '#636366',
};

// Normalize raw category key → display name
const CATEGORY_NAMES = {
  market:   'Market',
  online:   'Online Alışveriş',
  yemek:    'Yemek & İçecek',
  ulasim:   'Ulaşım',
  eglence:  'Eğlence',
  saglik:   'Sağlık',
  giyim:    'Giyim',
  diger:    'Diğer',
};

// Bank → emoji map for the upcoming payments list
const BANK_EMOJI = {
  'garanti':   '🏦',
  'akbank':    '🔴',
  'isbank':    '🏦',
  'yapi':      '🟡',
  'yapikrendi':'🟡',
  'ziraat':    '🌾',
  'halkbank':  '🔵',
  'vakif':     '🏦',
  'deniz':     '🌊',
  'ing':       '🟠',
  'qnb':       '🟣',
  'hsbc':      '🔷',
  'odeabank':  '⚫',
  default:     '💳',
};

function bankEmoji(name) {
  if (!name) return BANK_EMOJI.default;
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(BANK_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return BANK_EMOJI.default;
}

function daysBadgeVariant(days) {
  if (days < 0 || days < 3) return 'critical';
  if (days < 7) return 'warning';
  return 'normal';
}

function daysBadgeText(days) {
  if (days < 0) return `${Math.abs(days)}g gecikti`;
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days}g kaldı`;
}

// ── Skeleton components ────────────────────────────────────────────
function SkeletonBlock({ className }) {
  return <div className={`skeleton ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="dashboard__content">
      <div className="dashboard__section">
        <SkeletonBlock className="dashboard__skeleton-countdown" />
      </div>
      <div className="dashboard__section">
        <div className="dashboard__kpi-grid">
          <SkeletonBlock className="dashboard__skeleton-kpi" />
          <SkeletonBlock className="dashboard__skeleton-kpi" />
          <SkeletonBlock className="dashboard__skeleton-kpi" />
        </div>
      </div>
      <div className="dashboard__section">
        <SkeletonBlock className="dashboard__skeleton-chart" />
      </div>
      <div className="dashboard__section">
        <SkeletonBlock className="dashboard__skeleton-list-item" />
        <SkeletonBlock className="dashboard__skeleton-list-item" style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ startGmailSync, uploadPdf, isLoading, syncStatus }) {
  return (
    <div className="dashboard__empty">
      <div className="dashboard__empty-logo">💳</div>
      <div className="dashboard__empty-title">Hoş Geldiniz!</div>
      <div className="dashboard__empty-subtitle">
        Finansal durumunuzu tek ekranda görün.
      </div>
      <div className="dashboard__empty-hint">
        Başlamak için banka ekstrenizi yükleyin — saniyeler içinde analiz edelim.
      </div>
      <div className="dashboard__empty-upload">
        <UploadButton
          onUpload={uploadPdf}
          startGmailSync={startGmailSync}
          isLoading={isLoading}
          syncStatus={syncStatus}
        />
      </div>
    </div>
  );
}

// ── Main Dashboard screen ──────────────────────────────────────────
export default function Dashboard() {
  const { cards, isLoading: cardsLoading } = useCards();
  const {
    transactions,
    installments,
    isLoading: statementsLoading,
    syncStatus,
    startGmailSync,
    uploadPdf,
    isSyncing,
  } = useStatements();

  const isLoading = cardsLoading || statementsLoading;
  const hasData = (cards && cards.length > 0) || (transactions && transactions.length > 0);

  // ── Derived analytics ──────────────────────────────────────────
  const totalDebt = useMemo(() => getTotalDebt(cards), [cards]);
  const installmentLoad = useMemo(() => getTotalInstallmentLoad(installments), [installments]);
  const avgUtilization = useMemo(() => getAverageLimitUtilization(cards), [cards]);

  const nextPayment = useMemo(() => getNextPaymentDue(cards), [cards]);
  const daysUntilNext = useMemo(
    () => (nextPayment?.dueDate ? getDaysUntil(nextPayment.dueDate) : null),
    [nextPayment]
  );
  const nextPaymentDateStr = useMemo(
    () => (nextPayment?.dueDate ? formatTurkishDate(nextPayment.dueDate) : ''),
    [nextPayment]
  );

  const upcomingPayments = useMemo(() => getAllUpcomingPayments(cards), [cards]);

  // Category breakdown for donut chart
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions]);

  const donutData = useMemo(() => {
    if (!categoryBreakdown || categoryBreakdown.length === 0) return [];
    const total = categoryBreakdown.reduce((s, c) => s + (c.total ?? 0), 0);
    return categoryBreakdown.map((item) => {
      const key = (item.category ?? 'diger').toLowerCase();
      return {
        category: CATEGORY_NAMES[key] ?? item.category,
        amount: item.total ?? 0,
        percentage: total > 0 ? Math.round(((item.total ?? 0) / total) * 100) : 0,
        color: CATEGORY_COLORS[key] ?? CATEGORY_COLORS.diger,
      };
    });
  }, [categoryBreakdown]);

  const donutTotal = useMemo(() => {
    const sum = donutData.reduce((s, d) => s + d.amount, 0);
    return formatTRY(sum);
  }, [donutData]);

  // Insight banner — top category trend
  const topCategory = donutData[0];
  const topCategoryTrend = 'stable'; // real trend would compare with last month

  // Utilization variant
  const utilizationVariant = avgUtilization >= 80 ? 'danger' : avgUtilization >= 60 ? 'warning' : 'default';

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard__header">
        <h1 className="dashboard__title">Bugünkü Durum</h1>
        <div className="dashboard__header-actions">
          <button className="dashboard__notif-btn" aria-label="Bildirimler">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState
          startGmailSync={startGmailSync}
          uploadPdf={uploadPdf}
          isLoading={isSyncing}
          syncStatus={syncStatus}
        />
      ) : (
        <div className="dashboard__content">

          {/* ① Payment Countdown */}
          {nextPayment && daysUntilNext !== null && (
            <div className="dashboard__section">
              <PaymentCountdown
                daysUntil={daysUntilNext}
                paymentDate={nextPaymentDateStr}
                amount={formatTRY(nextPayment.minPayment ?? nextPayment.debt ?? 0)}
                cardName={nextPayment.cardName ?? nextPayment.bankName ?? ''}
              />
            </div>
          )}

          {/* ② KPI Metric Cards */}
          <div className="dashboard__section">
            <div className="dashboard__kpi-grid">
              <MetricCard
                icon={<CreditCard size={16} />}
                label="Ödenecek"
                value={formatTRY(totalDebt)}
                subLabel={`${cards.length} kart`}
                variant="danger"
              />
              <MetricCard
                icon={<RefreshCw size={16} />}
                label="Taksit Yükü"
                value={formatTRY(installmentLoad)}
                subLabel={`${installments?.length ?? 0} taksit`}
              />
              <MetricCard
                icon={<Shield size={16} />}
                label="Limit Riski"
                value={`%${Math.round(avgUtilization)}`}
                subLabel={avgUtilization >= 60 ? 'Yüksek' : 'Normal'}
                variant={utilizationVariant}
              />
            </div>
          </div>

          {/* ③ Spending Donut */}
          <div className="dashboard__section">
            <DonutChart
              data={donutData}
              totalAmount={donutTotal}
              title="Harcama Dağılımı"
              period="Bu Ay"
            />
          </div>

          {/* ④ Upcoming Payments */}
          {upcomingPayments && upcomingPayments.length > 0 && (
            <div className="dashboard__section">
              <div className="dashboard__section-header">
                <span className="dashboard__section-title">Yaklaşan Ödemeler</span>
                <span className="dashboard__section-link">Tümünü gör</span>
              </div>
              <div className="dashboard__upcoming-list">
                {upcomingPayments.slice(0, 5).map((payment, idx) => {
                  const days = payment.dueDate ? getDaysUntil(payment.dueDate) : 0;
                  const variant = daysBadgeVariant(days);
                  return (
                    <div
                      key={payment.id ?? idx}
                      className="upcoming-payment-item"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="upcoming-payment-item__bank-logo">
                        {bankEmoji(payment.bankName)}
                      </div>
                      <div className="upcoming-payment-item__info">
                        <div className="upcoming-payment-item__card-name">
                          {payment.cardName ?? payment.bankName ?? 'Kart'}
                        </div>
                        {payment.dueDate && (
                          <div className="upcoming-payment-item__due-date">
                            {formatTurkishDate(payment.dueDate)}
                          </div>
                        )}
                      </div>
                      <div className="upcoming-payment-item__right">
                        <span className="upcoming-payment-item__amount">
                          {formatTRY(payment.minPayment ?? payment.debt ?? 0)}
                        </span>
                        <span className={`upcoming-payment-item__days-badge upcoming-payment-item__days-badge--${variant}`}>
                          {daysBadgeText(days)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ⑤ Insight Banner */}
          {topCategory && (
            <div className="dashboard__section">
              <InsightBanner
                category={topCategory.category}
                changePercent={null}
                trend={topCategoryTrend}
              />
            </div>
          )}

          {/* ⑥ Upload Button */}
          <div className="dashboard__section">
            <UploadButton
              onUpload={uploadPdf}
              startGmailSync={startGmailSync}
              isLoading={isSyncing}
              syncStatus={syncStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
}
