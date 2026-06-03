import { useCallback, useMemo } from 'react';
import { useStatements as useStatementsContext } from '../context/StatementsContext.jsx';

/**
 * useStatements — wraps StatementsContext with derived selectors.
 */
export function useStatements() {
  const {
    statements,
    transactions,
    installments,
    recurring,
    isLoading,
    error,
    syncStatus,
    startGmailSync,
    uploadPdf,
    loadFromStorage,
    clearData,
    clearError,
  } = useStatementsContext();

  const isSyncing = useMemo(
    () => syncStatus === 'scanning' || syncStatus === 'parsing',
    [syncStatus]
  );

  const getTransactionsByCard = useCallback(
    (cardId) => transactions.filter((t) => t.cardId === cardId),
    [transactions]
  );

  const getTransactionsByCategory = useCallback(
    (category) => transactions.filter((t) => t.category === category),
    [transactions]
  );

  const getInstallmentsByCard = useCallback(
    (cardId) => installments.filter((i) => i.cardId === cardId),
    [installments]
  );

  const getActiveInstallments = useCallback(
    () => installments.filter((i) => i.remainingCount > 0),
    [installments]
  );

  const getTotalSpending = useCallback(
    (month) => {
      const filtered = month
        ? transactions.filter((t) => {
            const d = new Date(t.date);
            return d.getFullYear() === month.year && d.getMonth() + 1 === month.month;
          })
        : transactions;
      return filtered.reduce((sum, t) => sum + (t.amount || 0), 0);
    },
    [transactions]
  );

  const getSpendingByCategory = useCallback(() => {
    const map = {};
    transactions.forEach((t) => {
      const cat = t.category || 'diger';
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return map;
  }, [transactions]);

  return {
    statements,
    transactions,
    installments,
    recurring,
    isLoading,
    error,
    syncStatus,
    isSyncing,
    startGmailSync,
    uploadPdf,
    loadFromStorage,
    clearData,
    clearError,
    getTransactionsByCard,
    getTransactionsByCategory,
    getInstallmentsByCard,
    getActiveInstallments,
    getTotalSpending,
    getSpendingByCategory,
  };
}

export default useStatements;
