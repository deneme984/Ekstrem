import { useEffect, useRef } from 'react';
import './ProgressRing.css';

/**
 * ProgressRing — SVG circular progress indicator.
 *
 * Props:
 *   percentage  {number}  0-100 — fill percentage
 *   size        {number}  SVG diameter in px (default 72)
 *   strokeWidth {number}  ring stroke width in px (default 6)
 *   color       {string}  override color ('green'|'orange'|'red'|undefined)
 *   label       {string}  small text below the percentage
 *   sublabel    {string}  even smaller text (e.g. "limit")
 */
export default function ProgressRing({
  percentage = 0,
  size = 72,
  strokeWidth = 6,
  color,
  label,
  sublabel,
}) {
  const fillRef = useRef(null);

  const pct      = Math.max(0, Math.min(100, percentage));
  const radius   = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset   = circumference - (pct / 100) * circumference;

  // Determine color class based on percentage (unless overridden)
  const colorClass = (() => {
    if (color === 'green')  return 'progress-ring-fill--green';
    if (color === 'orange') return 'progress-ring-fill--orange';
    if (color === 'red')    return 'progress-ring-fill--red';
    if (pct > 75) return 'progress-ring-fill--red';
    if (pct > 50) return 'progress-ring-fill--orange';
    return 'progress-ring-fill--green';
  })();

  // Set CSS custom properties for the keyframe animation on mount
  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.setProperty('--ring-circumference', `${circumference}`);
    el.style.setProperty('--ring-offset', `${offset}`);
    // Trigger re-animation on change
    el.style.strokeDashoffset = offset;
  }, [offset, circumference]);

  return (
    <div
      className="progress-ring-wrapper"
      style={{ width: size, height: size }}
      aria-label={`${pct}% ${label || ''}`}
      role="img"
    >
      <svg
        className="progress-ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track */}
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Fill arc */}
        <circle
          ref={fillRef}
          className={`progress-ring-fill ${colorClass}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            '--ring-circumference': circumference,
            '--ring-offset': offset,
          }}
        />
      </svg>

      <div className="progress-ring-center">
        <span className="progress-ring-value">{pct}%</span>
        {label && (
          <span className="progress-ring-label">{label}</span>
        )}
        {sublabel && (
          <span className="progress-ring-label" style={{ opacity: 0.6 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
