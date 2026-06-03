import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './DonutChart.css';

// Register Chart.js components once
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * DonutChart
 * Props:
 *   data         {Array<{category, amount, percentage, color}>}
 *   totalAmount  {string}  — formatted total e.g. "₺18.964,50"
 *   title        {string}  — section title
 *   period       {string}  — e.g. "Bu Ay"
 */
export default function DonutChart({ data, totalAmount, title, period }) {
  const hasData = Array.isArray(data) && data.length > 0;

  const chartData = {
    labels: hasData ? data.map((d) => d.category) : [],
    datasets: [
      {
        data: hasData ? data.map((d) => d.amount) : [],
        backgroundColor: hasData ? data.map((d) => d.color) : [],
        borderColor: '#141414',
        borderWidth: 2,
        hoverBorderColor: '#1f1f1f',
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 600,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.09)',
        borderWidth: 1,
        titleColor: 'rgba(255,255,255,0.9)',
        bodyColor: 'rgba(255,255,255,0.6)',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const item = data[ctx.dataIndex];
            return ` ${item?.percentage ?? 0}%  ${item?.amount != null ? formatAmt(item.amount) : ''}`;
          },
        },
      },
    },
  };

  return (
    <div className="donut-chart animate-spring-bounce">
      <div className="donut-chart__header">
        <span className="donut-chart__title">{title ?? 'Harcama Dağılımı'}</span>
        {period && <span className="donut-chart__period">{period}</span>}
      </div>

      {hasData ? (
        <div className="donut-chart__body">
          {/* Canvas */}
          <div className="donut-chart__canvas-wrap">
            <Doughnut data={chartData} options={options} />
            <div className="donut-chart__center-text">
              <span className="donut-chart__center-label">Toplam</span>
              <span className="donut-chart__center-value">{totalAmount}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="donut-chart__legend">
            {data.map((item) => (
              <div key={item.category} className="donut-chart__legend-item">
                <span
                  className="donut-chart__legend-dot"
                  style={{ background: item.color }}
                />
                <div className="donut-chart__legend-info">
                  <div className="donut-chart__legend-name">{item.category}</div>
                  <div className="donut-chart__legend-amount">
                    {item.amount != null ? formatAmt(item.amount) : ''}
                  </div>
                </div>
                <span className="donut-chart__legend-pct">%{item.percentage}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="donut-chart__empty">
          <div className="donut-chart__empty-icon">📊</div>
          <div className="donut-chart__empty-title">Henüz harcama verisi yok</div>
          <div className="donut-chart__empty-body">
            Ekstrenizi yükleyin — harcama dağılımınız burada görünür.
          </div>
        </div>
      )}
    </div>
  );
}

/** Minimal local formatter to avoid circular deps. */
function formatAmt(num) {
  if (num == null) return '';
  return '₺' + Number(num).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
