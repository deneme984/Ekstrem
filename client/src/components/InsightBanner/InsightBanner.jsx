import { ChevronRight, TrendingUp } from 'lucide-react';
import './InsightBanner.css';

/**
 * InsightBanner
 * Props:
 *   category      {string}           — top spending category name
 *   changePercent {number}           — change vs last month (can be negative)
 *   trend         {'up'|'down'|'stable'}
 *   onPress       {Function}         — navigate to analytics
 */
export default function InsightBanner({ category, changePercent, trend = 'stable', onPress }) {
  // Hide if no category data
  if (!category) return null;

  const trendLabel = () => {
    if (trend === 'up') {
      const pct = changePercent != null ? Math.abs(changePercent).toFixed(0) : '?';
      return { text: `Geçen aya göre %${pct} daha fazla`, cls: 'up' };
    }
    if (trend === 'down') {
      const pct = changePercent != null ? Math.abs(changePercent).toFixed(0) : '?';
      return { text: `Geçen aya göre %${pct} daha az`, cls: 'down' };
    }
    return { text: 'Geçen ayla benzer', cls: 'stable' };
  };

  const { text: trendText, cls: trendCls } = trendLabel();

  return (
    <div className="insight-banner" role="button" tabIndex={0} onClick={onPress}>
      <div className="insight-banner__icon">
        <TrendingUp size={18} />
      </div>

      <div className="insight-banner__text">
        <div className="insight-banner__headline">
          Bu ay en yoğun kategori: <strong>{category}</strong>
        </div>
        <div className="insight-banner__sub">
          <span className={`insight-banner__trend insight-banner__trend--${trendCls}`}>
            {trendText}
          </span>
        </div>
      </div>

      <ChevronRight size={16} className="insight-banner__arrow" />
    </div>
  );
}
