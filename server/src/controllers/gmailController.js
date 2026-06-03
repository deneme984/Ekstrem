/**
 * @fileoverview Gmail Controller — Ekstrem v1.0
 *
 * Express route handlers for all Gmail scanning endpoints. Each handler:
 *   - Reads the authenticated user's access token from `req.user.accessToken`
 *     (set by `requireAuth` middleware after verifying the session/token)
 *   - Delegates heavy work to `GmailScanner` and the PDF parser service
 *   - Returns structured JSON responses
 *   - Handles all error cases gracefully with appropriate HTTP status codes
 *
 * In-memory scan state is kept per-user keyed by `userId` from `req.user`.
 * This is intentionally simple for the MVP; a persistent store (Redis / DB)
 * should replace it for multi-instance deployments.
 */

import GmailScanner from '../services/gmail/scanner.js';
import parserService from '../services/parser/index.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// In-memory scan state store
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScanState
 * @property {'idle'|'scanning'|'done'|'error'} status
 * @property {number|null} startedAt   - Unix timestamp (ms) when scan began
 * @property {number|null} finishedAt  - Unix timestamp (ms) when it completed
 * @property {number} found            - Number of statements found
 * @property {string[]} banks          - Unique bank IDs found
 * @property {Array} statements        - Full statement metadata array
 * @property {string|null} errorMessage - Error message if status === 'error'
 */

/** @type {Map<string, ScanState>} */
const scanStateStore = new Map();

/**
 * Get or initialise the scan state for a user.
 *
 * @param {string} userId
 * @returns {ScanState}
 */
function getScanState(userId) {
  if (!scanStateStore.has(userId)) {
    scanStateStore.set(userId, {
      status: 'idle',
      startedAt: null,
      finishedAt: null,
      found: 0,
      banks: [],
      statements: [],
      errorMessage: null,
    });
  }
  return scanStateStore.get(userId);
}

/**
 * Update scan state for a user (merges partial updates).
 *
 * @param {string} userId
 * @param {Partial<ScanState>} updates
 */
function updateScanState(userId, updates) {
  const current = getScanState(userId);
  scanStateStore.set(userId, { ...current, ...updates });
}

// ---------------------------------------------------------------------------
// Controller helpers
// ---------------------------------------------------------------------------

/**
 * Extract unique bank IDs from a list of statement objects and sort them.
 *
 * @param {Array} statements
 * @returns {string[]}
 */
function extractUniqueBanks(statements) {
  const bankIds = statements.map((s) => s.bankId).filter(Boolean);
  return [...new Set(bankIds)].sort();
}

/**
 * Serialize a statement object to a safe public shape (no internal state).
 *
 * @param {Object} s - Internal statement object
 * @returns {Object} Public statement metadata
 */
function serializeStatement(s) {
  return {
    messageId: s.messageId,
    bankId: s.bankId,
    bankName: s.bankName,
    confidence: s.confidence,
    subject: s.subject,
    from: s.from,
    date: s.date,
    hasAttachment: s.hasAttachment,
    attachmentCount: s.attachments?.length ?? 0,
    requiresManualUpload: s.requiresManualUpload,
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/gmail/scan
 *
 * Initiates a scan of the authenticated user's Gmail inbox for Turkish bank
 * credit card statement emails from the last 6 months.
 *
 * The scan runs synchronously within this request lifecycle for the MVP.
 * A scan in progress is idempotent: if a scan is already running for the
 * same user the current status is returned immediately.
 *
 * Request headers:
 *   Authorization: Bearer <google_access_token>  (set by requireAuth)
 *
 * Response 200:
 * ```json
 * { "found": 5, "banks": ["garantibbva", "yapikredi"], "statements": [...] }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function scanGmail(req, res) {
  const userId = req.user?.id ?? req.user?.sub ?? 'anonymous';
  const accessToken = req.user?.accessToken;

  if (!accessToken) {
    logger.warn(`scanGmail: missing accessToken for userId=${userId}`);
    return res.status(401).json({
      error: 'Missing access token. Please re-authenticate with Google.',
    });
  }

  const state = getScanState(userId);

  // Guard: do not start a second concurrent scan for the same user
  if (state.status === 'scanning') {
    logger.info(`scanGmail: scan already in progress for userId=${userId}`);
    return res.status(202).json({
      message: 'Scan already in progress',
      status: 'scanning',
      startedAt: state.startedAt,
    });
  }

  // Mark scan as in progress
  updateScanState(userId, {
    status: 'scanning',
    startedAt: Date.now(),
    finishedAt: null,
    found: 0,
    banks: [],
    statements: [],
    errorMessage: null,
  });

  logger.info(`scanGmail: starting Gmail scan for userId=${userId}`);

  try {
    const scanner = new GmailScanner(accessToken);
    const statements = await scanner.scanForStatements();
    const uniqueBanks = extractUniqueBanks(statements);

    updateScanState(userId, {
      status: 'done',
      finishedAt: Date.now(),
      found: statements.length,
      banks: uniqueBanks,
      statements,
    });

    logger.info(
      `scanGmail: scan complete for userId=${userId} — ` +
      `${statements.length} statements from ${uniqueBanks.length} banks`
    );

    return res.status(200).json({
      found: statements.length,
      banks: uniqueBanks,
      statements: statements.map(serializeStatement),
    });
  } catch (err) {
    logger.error(`scanGmail: scan failed for userId=${userId} — ${err.message}`);

    updateScanState(userId, {
      status: 'error',
      finishedAt: Date.now(),
      errorMessage: err.message,
    });

    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      return res.status(401).json({
        error: 'Gmail access denied. Please re-authorise the application.',
        detail: err.message,
      });
    }

    return res.status(500).json({
      error: 'Gmail scan failed due to an internal error.',
      detail: err.message,
    });
  }
}

/**
 * GET /api/gmail/scan/status
 *
 * Returns the current scan progress for the authenticated user.
 * Useful for polling from the frontend during a long-running scan.
 *
 * Response 200:
 * ```json
 * { "status": "done", "found": 5, "banks": [...], "startedAt": 1234567890 }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
function getScanStatus(req, res) {
  const userId = req.user?.id ?? req.user?.sub ?? 'anonymous';
  const state = getScanState(userId);

  logger.info(`getScanStatus: status="${state.status}" for userId=${userId}`);

  return res.status(200).json({
    status: state.status,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    found: state.found,
    banks: state.banks,
    errorMessage: state.errorMessage ?? null,
  });
}

/**
 * GET /api/gmail/statements
 *
 * Returns the list of statement emails identified in the most recent scan
 * (metadata only — no PDF data). If no scan has been run, returns an empty
 * array with a `scanRequired` hint.
 *
 * Response 200:
 * ```json
 * { "statements": [...], "found": 5, "scanRequired": false }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
function listStatements(req, res) {
  const userId = req.user?.id ?? req.user?.sub ?? 'anonymous';
  const state = getScanState(userId);

  if (state.status === 'idle') {
    logger.info(`listStatements: no scan data for userId=${userId}`);
    return res.status(200).json({
      statements: [],
      found: 0,
      banks: [],
      scanRequired: true,
      message: 'No scan data available. Run POST /api/gmail/scan first.',
    });
  }

  logger.info(
    `listStatements: returning ${state.statements.length} statements for userId=${userId}`
  );

  return res.status(200).json({
    statements: state.statements.map(serializeStatement),
    found: state.statements.length,
    banks: state.banks,
    scanStatus: state.status,
    scanRequired: false,
  });
}

/**
 * POST /api/gmail/statements/parse
 *
 * Downloads all PDF attachments from the user's found statements and passes
 * them through the PDF parser service.
 *
 * Request body (optional):
 * ```json
 * { "messageIds": ["<id1>", "<id2>"] }
 * ```
 * When `messageIds` is provided only those statements are parsed; otherwise
 * all statements with `hasAttachment === true` are parsed.
 *
 * Response 200:
 * ```json
 * {
 *   "cards": [...],
 *   "statements": [...],
 *   "transactions": [...],
 *   "skipped": [{ "messageId": "...", "reason": "..." }]
 * }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function parseStatements(req, res) {
  const userId = req.user?.id ?? req.user?.sub ?? 'anonymous';
  const accessToken = req.user?.accessToken;

  if (!accessToken) {
    logger.warn(`parseStatements: missing accessToken for userId=${userId}`);
    return res.status(401).json({
      error: 'Missing access token. Please re-authenticate with Google.',
    });
  }

  const state = getScanState(userId);

  if (state.status === 'idle' || state.statements.length === 0) {
    return res.status(400).json({
      error: 'No statements available. Run POST /api/gmail/scan first.',
    });
  }

  // Determine which statements to parse
  const requestedIds = Array.isArray(req.body?.messageIds)
    ? req.body.messageIds
    : null;

  const toParse = state.statements.filter((s) => {
    if (!s.hasAttachment) return false;
    if (requestedIds) return requestedIds.includes(s.messageId);
    return true;
  });

  // Collect statements that cannot be parsed (no PDF attachment)
  const skipped = state.statements
    .filter((s) => !s.hasAttachment)
    .map((s) => ({
      messageId: s.messageId,
      bankId: s.bankId,
      reason: s.requiresManualUpload
        ? 'No PDF attachment — requires manual upload'
        : 'No PDF attachment found',
    }));

  if (toParse.length === 0) {
    return res.status(200).json({
      cards: [],
      statements: [],
      transactions: [],
      skipped,
      message: 'No statements with PDF attachments to parse.',
    });
  }

  logger.info(
    `parseStatements: parsing ${toParse.length} PDFs for userId=${userId}`
  );

  const scanner = new GmailScanner(accessToken);
  const allCards = [];
  const allStatements = [];
  const allTransactions = [];
  const parseErrors = [];

  for (const stmt of toParse) {
    for (const attachment of stmt.attachments) {
      try {
        logger.info(
          `parseStatements: downloading "${attachment.filename}" ` +
          `(messageId=${stmt.messageId})`
        );

        const pdfBuffer = await scanner.downloadAttachment(
          stmt.messageId,
          attachment.attachmentId
        );

        // Delegate to the PDF parser service (implemented by PDF Parser agent)
        const parsed = await parserService.parse(pdfBuffer, {
          bankId: stmt.bankId,
          filename: attachment.filename,
          messageId: stmt.messageId,
        });

        if (parsed?.cards?.length) allCards.push(...parsed.cards);
        if (parsed?.statements?.length) allStatements.push(...parsed.statements);
        if (parsed?.transactions?.length) allTransactions.push(...parsed.transactions);
      } catch (err) {
        logger.error(
          `parseStatements: error parsing "${attachment.filename}" ` +
          `(messageId=${stmt.messageId}) — ${err.message}`
        );
        parseErrors.push({
          messageId: stmt.messageId,
          filename: attachment.filename,
          reason: err.message,
        });
      }
    }
  }

  logger.info(
    `parseStatements: done for userId=${userId} — ` +
    `${allCards.length} cards, ${allStatements.length} statements, ` +
    `${allTransactions.length} transactions, ${parseErrors.length} errors`
  );

  return res.status(200).json({
    cards: allCards,
    statements: allStatements,
    transactions: allTransactions,
    skipped: [...skipped, ...parseErrors],
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { scanGmail, getScanStatus, listStatements, parseStatements };
