import { NavLink, useLocation } from 'react-router-dom';
import { Home, ListFilter, CalendarDays, BarChart3, CreditCard } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/',             icon: Home,        label: 'Özet'       },
  { to: '/spending',     icon: ListFilter,  label: 'Harcamalar' },
  { to: '/installments', icon: CalendarDays, label: 'Taksitler' },
  { to: '/analytics',    icon: BarChart3,   label: 'Analiz'     },
  { to: '/cards',        icon: CreditCard,  label: 'Kartlarım'  },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav-bar" role="navigation" aria-label="Ana navigasyon">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to);

        return (
          <NavLink
            key={to}
            to={to}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            end={to === '/'}
          >
            <span className="bottom-nav-icon">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.8}
                aria-hidden="true"
              />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
