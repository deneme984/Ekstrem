import './TransactionItem.css';
import { CATEGORY_ICONS } from '../../utils/models.js';
import { formatTRY } from '../../utils/formatCurrency.js';

/**
 * Formats a transaction date for display.
 * Returns "Bugün · HH:MM" or "DD Aaa · HH:MM"
 */
function formatTxDate(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const now    = new Date();
  const isToday =
    date.getDate()     === now.getDate()     &&
    date.getMonth()    === now.getMonth()    &&
    date.getFullYear() === now.getFullYear();

  const hours   = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) return `Bugün · ${timeStr}`;

  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const day   = date.getDate();
  const month = months[date.getMonth()];
  return `${day} ${month} · ${timeStr}`;
}

/**
 * Returns a CSS class suffix based on the category name for icon coloring.
 */
function getCategoryClass(category) {
  if (!category) return 'default';
  // Map Turkish category names to class keys
  const map = {
    'Market':             'Market',
    'Online Alışveriş':  'Online',
    'Yemek':              'Yemek',
    'Ulaşım':             'Ulaşım',
    'Eğlence':            'Eğlence',
    'Sağlık':             'Sağlık',
    'Giyim':              'Giyim',
    'Akaryakıt':          'Akaryakıt',
    'Sigorta':            'Sigorta',
    'Fatura':             'Fatura',
    'Abonelik':           'Abonelik',
    'Eğitim':             'Eğitim',
    'Seyahat':            'Seyahat',
    'Diğer':              'Diğer',
  };
  return map[category] || 'default';
}

/**
 * TransactionItem
 *
 * Props:
 *   transaction {Transaction} — transaction object from useStatements()
 */
export default function TransactionItem({ transaction }) {
  if (!transaction) return null;

  const {
    merchantName,
    category,
    amount       = 0,
    date,
    isInstallment,
    installmentCurrent,
    installmentTotal,
  } = transaction;

  const icon         = CATEGORY_ICONS[category] || '📄';
  const catClass     = getCategoryClass(category);
  const isPositive   = amount < 0; // negative amount = refund/positive
  const displayAmt   = Math.abs(amount);
  const formattedAmt = formatTRY(displayAmt);
  const dateStr      = formatTxDate(date);

  return (
    <div className="transaction-item press-feedback" role="button" tabIndex={0}>
      {/* Category icon */}
      <div className={`tx-icon tx-icon--${catClass}`} aria-hidden="true">
        {icon}
      </div>

      {/* Middle info */}
      <div className="tx-info">
        <span className="tx-merchant" title={merchantName}>
          {merchantName || 'Bilinmeyen İşlem'}
        </span>
        <span className="tx-category">{category || 'Diğer'}</span>
      </div>

      {/* Right: amount + date */}
      <div className="tx-right">
        <div className="tx-amount-row">
          {isInstallment && installmentCurrent && installmentTotal && (
            <span className="tx-installment-badge">
              {installmentCurrent}/{installmentTotal}
            </span>
          )}
          <span className={`tx-amount ${isPositive ? 'tx-amount--positive' : ''}`}>
            {isPositive ? '+' : '-'}{formattedAmt}
          </span>
        </div>
        <span className="tx-date">{dateStr}</span>
      </div>
    </div>
  );
}
