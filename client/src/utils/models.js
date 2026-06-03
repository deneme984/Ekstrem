/**
 * @fileoverview Data model type definitions for the Ekstrem credit card analyzer.
 * All models are documented as JSDoc typedefs; no runtime classes are used.
 */

/**
 * @typedef {Object} Card
 * @property {string} id - UUID v4
 * @property {string} bankId - References BANK_REGISTRY bankId
 * @property {string} bankName - e.g. "Garanti BBVA"
 * @property {string} cardName - e.g. "Bonus"
 * @property {string} lastFourDigits - last 4 digits of card number
 * @property {'VISA'|'Mastercard'|'Troy'|'Amex'} cardNetwork - payment network
 * @property {string} cardTier - e.g. "Platinum", "Gold", "Classic"
 * @property {number} creditLimit - total credit limit in TRY
 * @property {number} currentDebt - d├Ânem borcu (current period debt) in TRY
 * @property {number} minimumPayment - minimum payment amount in TRY
 * @property {number} statementClosingDay - day of month statement closes (1-31)
 * @property {number} paymentDueDay - day of month payment is due (1-31)
 * @property {string} paymentDueDate - ISO date string of next payment due date
 * @property {string} statementDate - ISO date string of last statement
 * @property {string} brandColor - hex color code e.g. "#00A551"
 * @property {string} addedAt - ISO timestamp when card was added
 * @property {string} updatedAt - ISO timestamp of last update
 */

/**
 * @typedef {Object} Statement
 * @property {string} id - UUID v4
 * @property {string} cardId - references Card.id
 * @property {number} periodMonth - statement period month (1-12)
 * @property {number} periodYear - statement period year e.g. 2026
 * @property {number} totalAmount - d├Ânem borcu (total period debt) in TRY
 * @property {number} minimumPayment - minimum payment due in TRY
 * @property {number} previousBalance - previous period balance in TRY
 * @property {number} payments - payments made during period (typically negative) in TRY
 * @property {number} newSpending - new spending in period in TRY
 * @property {string} paymentDueDate - ISO date string of payment due date
 * @property {string} statementDate - ISO date string when statement was issued
 * @property {'gmail'|'manual_upload'} sourceType - how statement was imported
 * @property {string} sourceEmailId - Gmail message ID if sourced from Gmail
 * @property {string} parsedAt - ISO timestamp when statement was parsed
 * @property {Transaction[]} transactions - list of transactions in this statement
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - UUID v4
 * @property {string} statementId - references Statement.id
 * @property {string} cardId - references Card.id
 * @property {string} date - ISO date string of transaction
 * @property {string} description - raw description text from PDF
 * @property {string} merchantName - cleaned/normalized merchant name
 * @property {number} amount - transaction amount in TRY (positive = spending, negative = refund)
 * @property {'TRY'|'USD'|'EUR'} currency - transaction currency
 * @property {string} category - one of CATEGORIES values
 * @property {boolean} isInstallment - whether this is an installment payment
 * @property {number|null} installmentCurrent - current installment number e.g. 3
 * @property {number|null} installmentTotal - total installments e.g. 6
 * @property {number|null} originalAmount - original full purchase amount before installments
 */

/**
 * @typedef {Object} Installment
 * @property {string} id - UUID v4
 * @property {string} cardId - references Card.id
 * @property {string} transactionId - source transaction id that created this installment
 * @property {string} merchantName - merchant name
 * @property {string} description - installment description
 * @property {number} totalAmount - total purchase amount in TRY
 * @property {number} monthlyAmount - monthly installment payment in TRY
 * @property {number} totalInstallments - total number of installments
 * @property {number} paidInstallments - number of installments already paid
 * @property {number} remainingInstallments - installments remaining
 * @property {string} startDate - ISO date string when installment started
 * @property {string} estimatedEndDate - ISO date string of estimated final payment
 * @property {string} category - one of CATEGORIES values
 */

/**
 * @typedef {Object} RecurringPayment
 * @property {string} id - UUID v4
 * @property {string} cardId - references Card.id
 * @property {string} merchantName - merchant/service name
 * @property {number} amount - recurring payment amount in TRY
 * @property {number|null} previousAmount - previous amount for price change detection
 * @property {'monthly'|'yearly'|'quarterly'} frequency - billing frequency
 * @property {number} dayOfMonth - day of month payment typically occurs (1-31)
 * @property {string} category - one of CATEGORIES values
 * @property {boolean} isActive - whether this recurring payment is still active
 * @property {string} detectedSince - ISO timestamp when first detected
 * @property {string} lastSeen - ISO timestamp of most recent occurrence
 */

/**
 * @typedef {Object} AuthData
 * @property {string|null} gmailAccessToken - OAuth2 access token for Gmail
 * @property {string|null} gmailRefreshToken - OAuth2 refresh token for Gmail
 * @property {string|null} gmailTokenExpiry - ISO timestamp of token expiry
 * @property {string|null} userEmail - authenticated user's email address
 * @property {string|null} userName - authenticated user's display name
 * @property {string} authenticatedAt - ISO timestamp of last successful auth
 */

/**
 * @typedef {Object} AppSettings
 * @property {string} language - UI language code e.g. "tr"
 * @property {string} defaultCurrency - default display currency e.g. "TRY"
 * @property {boolean} notificationsEnabled - whether push notifications are on
 * @property {number} paymentReminderDays - days before due date to remind
 * @property {boolean} autoSync - whether to auto-sync Gmail
 * @property {string} theme - UI theme e.g. "dark" | "light"
 * @property {string} updatedAt - ISO timestamp of last settings update
 */

/**
 * @typedef {Object} CategoryBreakdown
 * @property {string} category - category name
 * @property {number} amount - total amount for this category in TRY
 * @property {number} percentage - percentage of total spending (0-100)
 */

/**
 * @typedef {Object} MonthlySpendingPoint
 * @property {number} month - month number (1-12)
 * @property {number} year - year
 * @property {number} total - total spending in TRY for this month
 */

/**
 * @typedef {Object} NextPaymentDue
 * @property {Card} card - card object
 * @property {number} daysUntil - number of days until payment is due
 * @property {number} amount - amount due in TRY
 */

/**
 * @typedef {Object} PriceChange
 * @property {RecurringPayment} payment - recurring payment object
 * @property {number} oldAmount - previous amount in TRY
 * @property {number} newAmount - current amount in TRY
 * @property {number} changePercent - percentage change (positive = increase)
 */

/**
 * Spending categories available in the Ekstrem app.
 * @type {string[]}
 */
export const CATEGORIES = [
  'Market',
  'Online Al─▒┼ƒveri┼ƒ',
  'Yemek',
  'Ula┼ƒ─▒m',
  'E─ƒlence',
  'Sa─ƒl─▒k',
  'Giyim',
  'Akaryak─▒t',
  'Sigorta',
  'Fatura',
  'Abonelik',
  'E─ƒitim',
  'Seyahat',
  'Di─ƒer'
];

/**
 * Emoji icons mapped to each spending category.
 * @type {Object.<string, string>}
 */
export const CATEGORY_ICONS = {
  'Market': '­ƒøÆ',
  'Online Al─▒┼ƒveri┼ƒ': '­ƒøì´©Å',
  'Yemek': '­ƒì¢´©Å',
  'Ula┼ƒ─▒m': '­ƒÜù',
  'E─ƒlence': '­ƒÄ¼',
  'Sa─ƒl─▒k': '­ƒÅÑ',
  'Giyim': '­ƒæò',
  'Akaryak─▒t': 'Ôø¢',
  'Sigorta': '­ƒøí´©Å',
  'Fatura': '­ƒôä',
  'Abonelik': '­ƒöä',
  'E─ƒitim': '­ƒôÜ',
  'Seyahat': 'Ô£ê´©Å',
  'Di─ƒer': '­ƒôª'
};

/**
 * Brand color suggestions per bank, used when auto-assigning card colors.
 * @type {Object.<string, string>}
 */
export const BANK_COLORS = {
  'Garanti BBVA': '#00A551',
  '─░┼ƒ Bankas─▒': '#003087',
  'Yap─▒ Kredi': '#004A97',
  'Akbank': '#EE1C24',
  'Halkbank': '#004A8F',
  'Vak─▒fbank': '#F5A800',
  'Ziraat Bankas─▒': '#E2001A',
  'Denizbank': '#005BAA',
  'QNB Finansbank': '#6D1F7B',
  'TEB': '#003087',
  '┼×ekerbank': '#00AEEF',
  'ING': '#FF6200',
  'HSBC': '#DB0011',
  'Odeabank': '#00A9CE'
};

/**
 * Registry of known Turkish banks and their identifiers.
 * @type {Array<{bankId: string, bankName: string}>}
 */
export const BANK_REGISTRY = [
  { bankId: 'garanti', bankName: 'Garanti BBVA' },
  { bankId: 'isbank', bankName: '─░┼ƒ Bankas─▒' },
  { bankId: 'yapikredi', bankName: 'Yap─▒ Kredi' },
  { bankId: 'akbank', bankName: 'Akbank' },
  { bankId: 'halkbank', bankName: 'Halkbank' },
  { bankId: 'vakifbank', bankName: 'Vak─▒fbank' },
  { bankId: 'ziraat', bankName: 'Ziraat Bankas─▒' },
  { bankId: 'denizbank', bankName: 'Denizbank' },
  { bankId: 'finansbank', bankName: 'QNB Finansbank' },
  { bankId: 'teb', bankName: 'TEB' },
  { bankId: 'sekerbank', bankName: '┼×ekerbank' },
  { bankId: 'ing', bankName: 'ING' },
  { bankId: 'hsbc', bankName: 'HSBC' },
  { bankId: 'odeabank', bankName: 'Odeabank' }
];
