import { useRef, useEffect, useCallback } from 'react';
import './CardCarousel.css';

/**
 * Derives a darker variant of a hex color for gradient end.
 * @param {string} hex - e.g. "#00A551"
 * @param {number} factor - darken factor 0-1 (default 0.55)
 * @returns {string} hex color
 */
function darkenHex(hex, factor = 0.55) {
  if (!hex || !hex.startsWith('#')) return '#0d3320';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/**
 * Returns the last 4 digits of a card number string.
 */
function lastFour(cardNumber) {
  if (!cardNumber) return '0000';
  const digits = String(cardNumber).replace(/\D/g, '');
  return digits.slice(-4).padStart(4, '0');
}

/**
 * CardNetworkLogo — renders VISA / Mastercard / Troy / generic
 */
function CardNetworkLogo({ network }) {
  const net = (network || '').toLowerCase();

  if (net.includes('visa')) {
    return <span className="card-network card-network--visa">VISA</span>;
  }

  if (net.includes('master') || net.includes('mc')) {
    return (
      <span className="card-network card-network--mastercard">
        <span className="mc-circle mc-circle--red" />
        <span className="mc-circle mc-circle--orange" />
      </span>
    );
  }

  if (net.includes('troy')) {
    return <span className="card-network card-network--troy">TROY</span>;
  }

  // fallback
  return <span className="card-network card-network--visa">VISA</span>;
}

/**
 * CreditCardVisual — renders a single premium physical card face.
 */
function CreditCardVisual({ card, isActive }) {
  const brandColor = card.brandColor || '#1a6b3c';
  const startColor = brandColor;
  const endColor   = darkenHex(brandColor, 0.50);
  const glowColor  = `${brandColor}50`; // 31% opacity

  const cardStyle = {
    '--card-color-start': startColor,
    '--card-color-end':   endColor,
    '--card-glow':        glowColor,
  };

  const maskedNumber = `•••• •••• •••• ${lastFour(card.cardNumber)}`;

  return (
    <div className="credit-card" style={cardStyle}>
      <div className="card-inner">
        {/* Top row */}
        <div className="card-top">
          <span className="card-bank-name">{card.bankName || 'Banka'}</span>
          <span className="card-contactless">)))​</span>
        </div>

        {/* Chip */}
        <div className="card-mid">
          <div className="card-chip" aria-hidden="true" />
        </div>

        {/* Bottom: number + network */}
        <div className="card-bottom">
          {card.productName && (
            <span className="card-product-name">{card.productName}</span>
          )}
          <div className="card-bottom-row">
            <span className="card-number">{maskedNumber}</span>
            <CardNetworkLogo network={card.cardNetwork || card.network} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CardCarousel
 *
 * Props:
 *   cards       {Card[]}    array of card objects from useCards()
 *   activeIndex {number}    currently focused card index
 *   onCardChange {Function} called with new index when card changes
 */
export default function CardCarousel({ cards = [], activeIndex = 0, onCardChange }) {
  const trackRef      = useRef(null);
  const isDragging    = useRef(false);
  const lastScrollLeft = useRef(0);
  const scrollTimer   = useRef(null);

  // Scroll to active card on mount or when activeIndex changes
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !cards.length) return;

    const slot = track.children[activeIndex];
    if (!slot) return;

    const trackLeft  = track.getBoundingClientRect().left;
    const slotLeft   = slot.getBoundingClientRect().left;
    const slotWidth  = slot.offsetWidth;
    const trackWidth = track.offsetWidth;

    const targetScroll = track.scrollLeft + slotLeft - trackLeft
      - (trackWidth / 2 - slotWidth / 2);

    track.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, [activeIndex, cards.length]);

  // Detect which card is centered after scroll ends
  const detectCenteredCard = useCallback(() => {
    const track = trackRef.current;
    if (!track || !cards.length) return;

    const trackCenter = track.getBoundingClientRect().left + track.offsetWidth / 2;
    let closestIndex = 0;
    let closestDist  = Infinity;

    Array.from(track.children).forEach((slot, i) => {
      const rect = slot.getBoundingClientRect();
      const slotCenter = rect.left + rect.width / 2;
      const dist = Math.abs(slotCenter - trackCenter);
      if (dist < closestDist) {
        closestDist  = dist;
        closestIndex = i;
      }
    });

    if (closestIndex !== activeIndex && onCardChange) {
      onCardChange(closestIndex);
    }
  }, [activeIndex, cards.length, onCardChange]);

  const handleScroll = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(detectCenteredCard, 80);
  }, [detectCenteredCard]);

  // Cleanup timeout on unmount
  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  // ── Empty state ─────────────────────────────────────────────
  if (!cards.length) {
    return (
      <div className="card-carousel-root">
        <div className="card-carousel-empty">
          <div className="card-carousel-empty-icon">💳</div>
          <div className="card-carousel-empty-title">Henüz kart eklenmedi</div>
          <div className="card-carousel-empty-sub">
            Ekstrelerinizi yükleyerek kartlarınızı ekleyin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-carousel-root">
      {/* Scrollable track */}
      <div
        ref={trackRef}
        className="card-carousel-track"
        onScroll={handleScroll}
        role="list"
        aria-label="Kartlarım"
      >
        {cards.map((card, i) => (
          <div
            key={card.id || i}
            className={`card-slot ${i === activeIndex ? 'card-slot--active' : 'card-slot--inactive'}`}
            role="listitem"
            aria-label={`${card.bankName} ${lastFour(card.cardNumber)}`}
            onClick={() => onCardChange && onCardChange(i)}
          >
            <CreditCardVisual card={card} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      {cards.length > 1 && (
        <div className="card-carousel-dots" role="tablist">
          {cards.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === activeIndex ? 'carousel-dot--active' : 'carousel-dot--inactive'}`}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Kart ${i + 1}`}
              onClick={() => onCardChange && onCardChange(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
