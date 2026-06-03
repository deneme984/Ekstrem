import './PaymentCountdown.css';

/**
 * PaymentCountdown
 * Props:
 *   daysUntil    {number}  — days remaining (negative = overdue)
 *   paymentDate  {string}  — formatted Turkish date string
 *   amount       {string}  — formatted currency string e.g. "₺24.580,75"
 *   cardName     {string}  — name of the card with next payment
 */
export default function PaymentCountdown({ daysUntil, paymentDate, amount, cardName }) {
  const isOverdue = daysUntil < 0;
  const absDays = Math.abs(daysUntil);

  // Determine urgency level
  let urgency = 'normal';
  if (isOverdue || absDays < 3) {
    urgency = 'critical';
  } else if (absDays < 7) {
    urgency = 'warning';
  }

  // Progress bar: how far through the 30-day billing cycle we are
  // 30 - daysUntil = days elapsed in cycle
  const CYCLE_DAYS = 30;
  const daysElapsed = isOverdue ? CYCLE_DAYS : Math.max(0, CYCLE_DAYS - daysUntil);
  const progressPercent = Math.min(100, Math.round((daysElapsed / CYCLE_DAYS) * 100));

  return (
    <div className={`payment-countdown urgency-${urgency}${isOverdue ? ' is-overdue' : ''}`}>
      {/* Top row */}
      <div className="payment-countdown__top">
        <span className="payment-countdown__label">Son Ödeme</span>
        {cardName && (
          <span className="payment-countdown__card-name">{cardName}</span>
        )}
      </div>

      {/* Hero days */}
      <div className="payment-countdown__hero">
        <span className="payment-countdown__days-number">
          {isOverdue ? absDays : daysUntil}
        </span>
        <span className="payment-countdown__days-unit">gün</span>
      </div>

      {/* Overdue badge or meta row */}
      {isOverdue ? (
        <div className="payment-countdown__overdue-badge">
          ⚠ {absDays} gün gecikti
        </div>
      ) : (
        <div className="payment-countdown__meta">
          <span className="payment-countdown__date">
            Son ödeme: {paymentDate}
          </span>
          {amount && (
            <span className="payment-countdown__amount">{amount}</span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="payment-countdown__progress-wrap">
        <div className="payment-countdown__progress-labels">
          <span className="payment-countdown__progress-label-text">Dönem başlangıcı</span>
          <span className="payment-countdown__progress-label-text">Son gün</span>
        </div>
        <div className="payment-countdown__progress-track">
          <div
            className="payment-countdown__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
