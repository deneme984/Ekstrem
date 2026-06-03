/**
 * @fileoverview localStorage service for the Ekstrem credit card analyzer.
 * Provides full CRUD operations for all app data entities.
 * All methods handle null/undefined gracefully and never throw.
 * Data is stored as JSON in localStorage under namespaced keys.
 */

/**
 * Namespaced localStorage keys for all Ekstrem data.
 * @type {Object.<string, string>}
 */
const STORAGE_KEYS = {
  CARDS: 'ekstrem_cards',
  STATEMENTS: 'ekstrem_statements',
  TRANSACTIONS: 'ekstrem_transactions',
  INSTALLMENTS: 'ekstrem_installments',
  RECURRING: 'ekstrem_recurring',
  AUTH: 'ekstrem_auth',
  LAST_SYNC: 'ekstrem_last_sync',
  APP_SETTINGS: 'ekstrem_settings'
};

// ─── Generic storage primitives ───────────────────────────────────────────────

/**
 * Reads and parses a JSON value from localStorage.
 * @param {string} key - Storage key
 * @param {*} [defaultValue=null] - Value to return when key is missing or parse fails
 * @returns {*} Parsed value or defaultValue
 * @private
 */
function _get(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Serializes and writes a value to localStorage.
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True on success, false on failure
 * @private
 */
function _set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes a key from localStorage.
 * @param {string} key - Storage key
 * @private
 */
function _remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}

// ─── Cards ────────────────────────────────────────────────────────────────────

/**
 * Replaces the entire cards collection in storage.
 *
 * @param {import('../utils/models.js').Card[]} cards - Array of card objects
 * @returns {boolean} True on success
 */
export function saveCards(cards) {
  if (!Array.isArray(cards)) return false;
  return _set(STORAGE_KEYS.CARDS, cards);
}

/**
 * Retrieves all stored cards.
 *
 * @returns {import('../utils/models.js').Card[]} Array of card objects, empty array if none
 */
export function getCards() {
  return _get(STORAGE_KEYS.CARDS, []);
}

/**
 * Retrieves a single card by its ID.
 *
 * @param {string} id - Card UUID
 * @returns {import('../utils/models.js').Card|null} Card object or null if not found
 */
export function getCardById(id) {
  if (!id) return null;
  const cards = getCards();
  return cards.find((c) => c && c.id === id) || null;
}

/**
 * Upserts a card: updates if it exists (matched by id), appends if new.
 * Sets updatedAt to current ISO timestamp on every call.
 *
 * @param {import('../utils/models.js').Card} card - Card object with at minimum an `id` field
 * @returns {boolean} True on success
 */
export function upsertCard(card) {
  if (!card || !card.id) return false;
  const cards = getCards();
  const now = new Date().toISOString();
  const idx = cards.findIndex((c) => c && c.id === card.id);

  if (idx >= 0) {
    cards[idx] = { ...cards[idx], ...card, updatedAt: now };
  } else {
    cards.push({ ...card, addedAt: card.addedAt || now, updatedAt: now });
  }

  return saveCards(cards);
}

/**
 * Removes a card from storage by ID.
 *
 * @param {string} id - Card UUID
 * @returns {boolean} True if a card was found and removed, false otherwise
 */
export function deleteCard(id) {
  if (!id) return false;
  const cards = getCards();
  const filtered = cards.filter((c) => c && c.id !== id);
  if (filtered.length === cards.length) return false;
  return saveCards(filtered);
}

// ─── Statements ───────────────────────────────────────────────────────────────

/**
 * Replaces the entire statements collection in storage.
 *
 * @param {import('../utils/models.js').Statement[]} statements
 * @returns {boolean} True on success
 */
export function saveStatements(statements) {
  if (!Array.isArray(statements)) return false;
  return _set(STORAGE_KEYS.STATEMENTS, statements);
}

/**
 * Retrieves all stored statements.
 *
 * @returns {import('../utils/models.js').Statement[]}
 */
export function getStatements() {
  return _get(STORAGE_KEYS.STATEMENTS, []);
}

/**
 * Retrieves all statements for a given card.
 *
 * @param {string} cardId - Card UUID
 * @returns {import('../utils/models.js').Statement[]} Filtered array
 */
export function getStatementsByCardId(cardId) {
  if (!cardId) return [];
  return getStatements().filter((s) => s && s.cardId === cardId);
}

/**
 * Retrieves all statements for a specific month and year.
 *
 * @param {number} month - Month number (1-12)
 * @param {number} year - Full year e.g. 2026
 * @returns {import('../utils/models.js').Statement[]} Filtered array
 */
export function getStatementsByMonth(month, year) {
  if (!month || !year) return [];
  return getStatements().filter(
    (s) => s && s.periodMonth === month && s.periodYear === year
  );
}

/**
 * Upserts a statement: updates if exists (by id), appends if new.
 *
 * @param {import('../utils/models.js').Statement} statement
 * @returns {boolean} True on success
 */
export function upsertStatement(statement) {
  if (!statement || !statement.id) return false;
  const statements = getStatements();
  const now = new Date().toISOString();
  const idx = statements.findIndex((s) => s && s.id === statement.id);

  if (idx >= 0) {
    statements[idx] = { ...statements[idx], ...statement };
  } else {
    statements.push({ ...statement, parsedAt: statement.parsedAt || now });
  }

  return saveStatements(statements);
}

/**
 * Removes a statement from storage by ID.
 *
 * @param {string} id - Statement UUID
 * @returns {boolean} True if removed
 */
export function deleteStatement(id) {
  if (!id) return false;
  const statements = getStatements();
  const filtered = statements.filter((s) => s && s.id !== id);
  if (filtered.length === statements.length) return false;
  return saveStatements(filtered);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Replaces the entire transactions collection in storage.
 *
 * @param {import('../utils/models.js').Transaction[]} transactions
 * @returns {boolean} True on success
 */
export function saveTransactions(transactions) {
  if (!Array.isArray(transactions)) return false;
  return _set(STORAGE_KEYS.TRANSACTIONS, transactions);
}

/**
 * Retrieves all stored transactions.
 *
 * @returns {import('../utils/models.js').Transaction[]}
 */
export function getTransactions() {
  return _get(STORAGE_KEYS.TRANSACTIONS, []);
}

/**
 * Retrieves all transactions belonging to a specific statement.
 *
 * @param {string} statementId - Statement UUID
 * @returns {import('../utils/models.js').Transaction[]}
 */
export function getTransactionsByStatementId(statementId) {
  if (!statementId) return [];
  return getTransactions().filter((t) => t && t.statementId === statementId);
}

/**
 * Retrieves all transactions for a given card across all statements.
 *
 * @param {string} cardId - Card UUID
 * @returns {import('../utils/models.js').Transaction[]}
 */
export function getTransactionsByCardId(cardId) {
  if (!cardId) return [];
  return getTransactions().filter((t) => t && t.cardId === cardId);
}

/**
 * Retrieves transactions filtered by category.
 *
 * @param {string} category - Category name from CATEGORIES
 * @returns {import('../utils/models.js').Transaction[]}
 */
export function getTransactionsByCategory(category) {
  if (!category) return [];
  return getTransactions().filter((t) => t && t.category === category);
}

/**
 * Bulk upserts an array of transactions (matched by id).
 * More efficient than calling upsertTransaction for each item.
 *
 * @param {import('../utils/models.js').Transaction[]} newTransactions
 * @returns {boolean} True on success
 */
export function upsertTransactions(newTransactions) {
  if (!Array.isArray(newTransactions)) return false;
  const existing = getTransactions();
  const idMap = new Map(existing.map((t) => [t.id, t]));

  for (const tx of newTransactions) {
    if (tx && tx.id) {
      idMap.set(tx.id, { ...(idMap.get(tx.id) || {}), ...tx });
    }
  }

  return saveTransactions(Array.from(idMap.values()));
}

/**
 * Removes all transactions belonging to a specific statement.
 *
 * @param {string} statementId - Statement UUID
 * @returns {boolean} True on success
 */
export function deleteTransactionsByStatementId(statementId) {
  if (!statementId) return false;
  const transactions = getTransactions().filter(
    (t) => t && t.statementId !== statementId
  );
  return saveTransactions(transactions);
}

// ─── Installments ─────────────────────────────────────────────────────────────

/**
 * Replaces the entire installments collection in storage.
 *
 * @param {import('../utils/models.js').Installment[]} installments
 * @returns {boolean} True on success
 */
export function saveInstallments(installments) {
  if (!Array.isArray(installments)) return false;
  return _set(STORAGE_KEYS.INSTALLMENTS, installments);
}

/**
 * Retrieves all stored installments.
 *
 * @returns {import('../utils/models.js').Installment[]}
 */
export function getInstallments() {
  return _get(STORAGE_KEYS.INSTALLMENTS, []);
}

/**
 * Retrieves all installments for a given card.
 *
 * @param {string} cardId - Card UUID
 * @returns {import('../utils/models.js').Installment[]}
 */
export function getInstallmentsByCardId(cardId) {
  if (!cardId) return [];
  return getInstallments().filter((i) => i && i.cardId === cardId);
}

/**
 * Retrieves only active installments (those with remaining payments > 0).
 *
 * @returns {import('../utils/models.js').Installment[]}
 */
export function getActiveInstallments() {
  return getInstallments().filter(
    (i) => i && i.remainingInstallments > 0
  );
}

/**
 * Upserts an installment: updates if exists (by id), appends if new.
 *
 * @param {import('../utils/models.js').Installment} installment
 * @returns {boolean} True on success
 */
export function upsertInstallment(installment) {
  if (!installment || !installment.id) return false;
  const installments = getInstallments();
  const idx = installments.findIndex((i) => i && i.id === installment.id);

  if (idx >= 0) {
    installments[idx] = { ...installments[idx], ...installment };
  } else {
    installments.push(installment);
  }

  return saveInstallments(installments);
}

/**
 * Removes an installment from storage by ID.
 *
 * @param {string} id - Installment UUID
 * @returns {boolean} True if removed
 */
export function deleteInstallment(id) {
  if (!id) return false;
  const installments = getInstallments();
  const filtered = installments.filter((i) => i && i.id !== id);
  if (filtered.length === installments.length) return false;
  return saveInstallments(filtered);
}

// ─── Recurring Payments ───────────────────────────────────────────────────────

/**
 * Replaces the entire recurring payments collection in storage.
 *
 * @param {import('../utils/models.js').RecurringPayment[]} recurring
 * @returns {boolean} True on success
 */
export function saveRecurring(recurring) {
  if (!Array.isArray(recurring)) return false;
  return _set(STORAGE_KEYS.RECURRING, recurring);
}

/**
 * Retrieves all stored recurring payments.
 *
 * @returns {import('../utils/models.js').RecurringPayment[]}
 */
export function getRecurring() {
  return _get(STORAGE_KEYS.RECURRING, []);
}

/**
 * Retrieves only active recurring payments.
 *
 * @returns {import('../utils/models.js').RecurringPayment[]}
 */
export function getActiveRecurring() {
  return getRecurring().filter((r) => r && r.isActive === true);
}

/**
 * Retrieves recurring payments for a given card.
 *
 * @param {string} cardId - Card UUID
 * @returns {import('../utils/models.js').RecurringPayment[]}
 */
export function getRecurringByCardId(cardId) {
  if (!cardId) return [];
  return getRecurring().filter((r) => r && r.cardId === cardId);
}

/**
 * Upserts a recurring payment: updates if exists (by id), appends if new.
 *
 * @param {import('../utils/models.js').RecurringPayment} payment
 * @returns {boolean} True on success
 */
export function upsertRecurring(payment) {
  if (!payment || !payment.id) return false;
  const recurring = getRecurring();
  const idx = recurring.findIndex((r) => r && r.id === payment.id);

  if (idx >= 0) {
    recurring[idx] = { ...recurring[idx], ...payment };
  } else {
    recurring.push(payment);
  }

  return saveRecurring(recurring);
}

/**
 * Removes a recurring payment from storage by ID.
 *
 * @param {string} id - RecurringPayment UUID
 * @returns {boolean} True if removed
 */
export function deleteRecurring(id) {
  if (!id) return false;
  const recurring = getRecurring();
  const filtered = recurring.filter((r) => r && r.id !== id);
  if (filtered.length === recurring.length) return false;
  return saveRecurring(filtered);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Persists authentication data (OAuth tokens, user info) to storage.
 *
 * @param {import('../utils/models.js').AuthData} authData
 * @returns {boolean} True on success
 */
export function saveAuthData(authData) {
  if (!authData || typeof authData !== 'object') return false;
  return _set(STORAGE_KEYS.AUTH, authData);
}

/**
 * Retrieves stored authentication data.
 *
 * @returns {import('../utils/models.js').AuthData|null}
 */
export function getAuthData() {
  return _get(STORAGE_KEYS.AUTH, null);
}

/**
 * Removes all authentication data from storage (sign-out).
 */
export function clearAuthData() {
  _remove(STORAGE_KEYS.AUTH);
}

/**
 * Checks whether a stored auth token appears valid (exists and not expired).
 *
 * @returns {boolean} True if an unexpired access token is present
 */
export function isAuthValid() {
  const auth = getAuthData();
  if (!auth || !auth.gmailAccessToken) return false;
  if (!auth.gmailTokenExpiry) return true;

  try {
    return new Date(auth.gmailTokenExpiry).getTime() > Date.now();
  } catch {
    return false;
  }
}

// ─── Last Sync ────────────────────────────────────────────────────────────────

/**
 * Stores the ISO timestamp of the most recent Gmail sync.
 *
 * @param {string} isoTimestamp - ISO timestamp string
 * @returns {boolean} True on success
 */
export function saveLastSync(isoTimestamp) {
  if (!isoTimestamp) return false;
  return _set(STORAGE_KEYS.LAST_SYNC, isoTimestamp);
}

/**
 * Retrieves the ISO timestamp of the most recent Gmail sync.
 *
 * @returns {string|null} ISO timestamp or null if never synced
 */
export function getLastSync() {
  return _get(STORAGE_KEYS.LAST_SYNC, null);
}

// ─── App Settings ─────────────────────────────────────────────────────────────

/**
 * Default application settings.
 * @type {import('../utils/models.js').AppSettings}
 */
const DEFAULT_SETTINGS = {
  language: 'tr',
  defaultCurrency: 'TRY',
  notificationsEnabled: true,
  paymentReminderDays: 3,
  autoSync: false,
  theme: 'dark',
  updatedAt: new Date().toISOString()
};

/**
 * Saves application settings, merging with existing settings.
 *
 * @param {Partial<import('../utils/models.js').AppSettings>} settings
 * @returns {boolean} True on success
 */
export function saveSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  const existing = getSettings();
  const merged = {
    ...existing,
    ...settings,
    updatedAt: new Date().toISOString()
  };
  return _set(STORAGE_KEYS.APP_SETTINGS, merged);
}

/**
 * Retrieves current application settings, merging with defaults.
 *
 * @returns {import('../utils/models.js').AppSettings}
 */
export function getSettings() {
  const stored = _get(STORAGE_KEYS.APP_SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Clears all Ekstrem data from localStorage.
 * Does NOT clear keys belonging to other apps.
 *
 * @returns {boolean} True on success
 */
export function clearAll() {
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      _remove(key);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Exports a full JSON backup of all Ekstrem data.
 * Useful for manual export / debugging.
 *
 * @returns {Object} Full data snapshot with a timestamp
 *
 * @example
 * const backup = exportData();
 * // { exportedAt: "2026-06-03T08:00:00.000Z", cards: [...], ... }
 */
export function exportData() {
  return {
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    cards: getCards(),
    statements: getStatements(),
    transactions: getTransactions(),
    installments: getInstallments(),
    recurring: getRecurring(),
    settings: getSettings(),
    lastSync: getLastSync()
  };
}

/**
 * Imports a full data backup (previously produced by exportData).
 * Overwrites all existing data. Does not import auth data for security.
 *
 * @param {Object} backup - Backup object from exportData()
 * @returns {{ success: boolean, errors: string[] }} Result report
 */
export function importData(backup) {
  const errors = [];

  if (!backup || typeof backup !== 'object') {
    return { success: false, errors: ['Invalid backup object'] };
  }

  if (Array.isArray(backup.cards)) {
    if (!saveCards(backup.cards)) errors.push('Failed to import cards');
  }
  if (Array.isArray(backup.statements)) {
    if (!saveStatements(backup.statements)) errors.push('Failed to import statements');
  }
  if (Array.isArray(backup.transactions)) {
    if (!saveTransactions(backup.transactions)) errors.push('Failed to import transactions');
  }
  if (Array.isArray(backup.installments)) {
    if (!saveInstallments(backup.installments)) errors.push('Failed to import installments');
  }
  if (Array.isArray(backup.recurring)) {
    if (!saveRecurring(backup.recurring)) errors.push('Failed to import recurring');
  }
  if (backup.settings && typeof backup.settings === 'object') {
    if (!saveSettings(backup.settings)) errors.push('Failed to import settings');
  }

  return { success: errors.length === 0, errors };
}

/**
 * Returns an approximate size report of each storage key in bytes.
 * Useful for debugging storage usage.
 *
 * @returns {Object.<string, number>} Map of key → byte size
 */
export function getStorageReport() {
  const report = {};
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      report[name] = raw ? new Blob([raw]).size : 0;
    } catch {
      report[name] = 0;
    }
  }
  return report;
}
