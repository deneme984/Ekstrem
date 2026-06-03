import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const STORAGE_KEY = 'ekstrem_statements';

/**
 * Statements state shape:
 * {
 *   statements: Statement[],
 *   transactions: Transaction[],
 *   installments: Installment[],
 *   recurring: RecurringCharge[],
 *   isLoading: boolean,
 *   error: string | null,
 *   syncStatus: 'idle'|'scanning'|'parsing'|'complete'|'error',
 * }
 */

const StatementsContext = createContext(null);

const INITIAL_DATA = {
  statements:   [],
  transactions: [],
  installments: [],
  recurring:    [],
};

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DATA;
    const parsed = JSON.parse(raw);
    return {
      statements:   Array.isArray(parsed.statements)   ? parsed.statements   : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      installments: Array.isArray(parsed.installments) ? parsed.installments : [],
      recurring:    Array.isArray(parsed.recurring)    ? parsed.recurring    : [],
    };
  } catch {
    return INITIAL_DATA;
  }
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function StatementsProvider({ children }) {
  const [statements, setStatements]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [recurring, setRecurring]       = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState(null);
  const [syncStatus, setSyncStatus]     = useState('idle');

  const hydrateState = useCallback((data) => {
    setStatements(data.statements);
    setTransactions(data.transactions);
    setInstallments(data.installments);
    setRecurring(data.recurring);
  }, []);

  const persistAndUpdate = useCallback((data) => {
    hydrateState(data);
    saveToLocalStorage(data);
  }, [hydrateState]);

  const loadFromStorage = useCallback(() => {
    setIsLoading(true);
    try {
      const data = loadFromLocalStorage();
      hydrateState(data);
    } catch {
      setError('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [hydrateState]);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const startGmailSync = useCallback(async () => {
    setSyncStatus('scanning');
    setError(null);
    try {
      // Step 1: Scan Gmail for bank statement emails
      const scanResponse = await api.post('/gmail/scan');
      const { emailIds } = scanResponse.data;

      // Step 2: Parse found emails into structured data
      setSyncStatus('parsing');
      const parseResponse = await api.post('/gmail/statements/parse', { emailIds });
      const { statements, transactions, installments, recurring } = parseResponse.data;

      const data = {
        statements:   statements   || [],
        transactions: transactions || [],
        installments: installments || [],
        recurring:    recurring    || [],
      };
      persistAndUpdate(data);
      setSyncStatus('complete');
    } catch (err) {
      const message = err.response?.data?.message || 'Gmail senkronizasyonu başarısız oldu.';
      setError(message);
      setSyncStatus('error');
    }
  }, [persistAndUpdate]);

  const uploadPdf = useCallback(async (file, bankId) => {
    setSyncStatus('parsing');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('bankId', bankId);

      const response = await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const { statements, transactions, installments, recurring } = response.data;

      // Merge with existing data
      const current = loadFromLocalStorage();
      const merged = {
        statements:   [...current.statements,   ...(statements   || [])],
        transactions: [...current.transactions, ...(transactions || [])],
        installments: [...current.installments, ...(installments || [])],
        recurring:    [...current.recurring,    ...(recurring    || [])],
      };
      persistAndUpdate(merged);
      setSyncStatus('complete');
    } catch (err) {
      const message = err.response?.data?.message || 'PDF yüklenirken bir hata oluştu.';
      setError(message);
      setSyncStatus('error');
    }
  }, [persistAndUpdate]);

  const clearData = useCallback(() => {
    persistAndUpdate(INITIAL_DATA);
    setSyncStatus('idle');
    setError(null);
  }, [persistAndUpdate]);

  const clearError = useCallback(() => {
    setError(null);
    if (syncStatus === 'error') setSyncStatus('idle');
  }, [syncStatus]);

  const value = {
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
  };

  return (
    <StatementsContext.Provider value={value}>
      {children}
    </StatementsContext.Provider>
  );
}

export function useStatements() {
  const context = useContext(StatementsContext);
  if (!context) {
    throw new Error('useStatements must be used within a StatementsProvider');
  }
  return context;
}

export default StatementsContext;
