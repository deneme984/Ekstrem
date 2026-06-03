import { useCallback } from 'react';
import { useCards as useCardsContext } from '../context/CardsContext.jsx';

/**
 * useCards — wraps CardsContext with derived selectors.
 */
export function useCards() {
  const {
    cards,
    isLoading,
    error,
    lastUpdated,
    loadCards,
    refreshCards,
    addCard,
    removeCard,
    clearError,
  } = useCardsContext();

  const getTotalBalance = useCallback(
    () => cards.reduce((sum, card) => sum + (card.balance || 0), 0),
    [cards]
  );

  const getTotalLimit = useCallback(
    () => cards.reduce((sum, card) => sum + (card.limit || 0), 0),
    [cards]
  );

  const getCardById = useCallback(
    (id) => cards.find((c) => c.id === id) || null,
    [cards]
  );

  const getCardsByBank = useCallback(
    (bankId) => cards.filter((c) => c.bankId === bankId),
    [cards]
  );

  return {
    cards,
    isLoading,
    error,
    lastUpdated,
    loadCards,
    refreshCards,
    addCard,
    removeCard,
    clearError,
    getTotalBalance,
    getTotalLimit,
    getCardById,
    getCardsByBank,
  };
}

export default useCards;
