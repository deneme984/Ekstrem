import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ekstrem_cards';

/**
 * Cards state shape:
 * {
 *   cards: Card[],
 *   isLoading: boolean,
 *   error: string | null,
 *   lastUpdated: number | null,
 * }
 *
 * Card shape: { id, bankId, bankName, last4, cardType, color, limit, balance, dueDate }
 */

const CardsContext = createContext(null);

function loadCardsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCardsToStorage(cards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore quota
  }
}

export function CardsProvider({ children }) {
  const [cards, setCards]           = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadCards = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const stored = loadCardsFromStorage();
      setCards(stored);
      if (stored.length > 0) setLastUpdated(Date.now());
    } catch {
      setError('Kartlar yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const refreshCards = useCallback((parsedData) => {
    if (!Array.isArray(parsedData)) return;
    setCards((prev) => {
      const merged = [...prev];
      parsedData.forEach((newCard) => {
        const idx = merged.findIndex((c) => c.id === newCard.id);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...newCard };
        } else {
          merged.push(newCard);
        }
      });
      saveCardsToStorage(merged);
      return merged;
    });
    setLastUpdated(Date.now());
  }, []);

  const addCard = useCallback((card) => {
    setCards((prev) => {
      if (prev.find((c) => c.id === card.id)) return prev;
      const updated = [...prev, card];
      saveCardsToStorage(updated);
      return updated;
    });
    setLastUpdated(Date.now());
  }, []);

  const removeCard = useCallback((cardId) => {
    setCards((prev) => {
      const updated = prev.filter((c) => c.id !== cardId);
      saveCardsToStorage(updated);
      return updated;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    cards,
    isLoading,
    error,
    lastUpdated,
    loadCards,
    refreshCards,
    addCard,
    removeCard,
    clearError,
  };

  return (
    <CardsContext.Provider value={value}>
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) {
    throw new Error('useCards must be used within a CardsProvider');
  }
  return context;
}

export default CardsContext;
