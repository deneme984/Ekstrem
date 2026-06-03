import './MetricCard.css';

/**
 * MetricCard
 * Props:
 *   icon      {ReactNode} — Lucide icon element (already sized)
 *   label     {string}   — Short label e.g. "Ödenecek"
 *   value     {string}   — Primary value e.g. "₺24.580,75"
 *   subLabel  {string}   — Secondary detail text
 *   variant   {'default'|'danger'|'warning'|'success'}
 *   onClick   {Function} — tap handler
 */
export default function MetricCard({
  icon,
  label,
  value,
  subLabel,
  variant = 'default',
  onClick,
}) {
  const variantClass = variant !== 'default' ? ` metric-card--${variant}` : '';

  return (
    <div
      className={`metric-card${variantClass}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {icon && (
        <div className="metric-card__icon">{icon}</div>
      )}
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{value}</span>
      {subLabel && (
        <span className="metric-card__sub">{subLabel}</span>
      )}
    </div>
  );
}
