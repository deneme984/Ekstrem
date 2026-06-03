/**
 * @fileoverview Gmail Scanner Service — Ekstrem v1.0
 *
 * Provides the `GmailScanner` class which wraps the Google Gmail API to:
 *   - Search the user's inbox for Turkish bank credit card statement emails
 *   - Retrieve full message details and extract PDF attachment metadata
 *   - Download PDF attachment bytes for downstream parsing
 *
 * Authentication: OAuth 2.0 access token supplied by the auth middleware.
 * The token is injected at construction time; no refresh logic here — the
 * auth layer is responsible for ensuring the token is valid.
 *
 * Error handling strategy:
 *   - Transient API errors (429, 5xx) are retried with exponential back-off
 *     (max 3 attempts, base delay 1 s).
 *   - Permanent errors (401, 403) are thrown immediately so the caller can
 *     surface them to the client.
 *   - Per-message errors are caught, logged, and the message is skipped so
 *     that one bad email doesn't abort the whole scan.
 */

import { google } from 'googleapis';
import { BANK_REGISTRY } from '../../config/banks.js';
import {
  detectBankFromMessage,
  extractSenderEmail,
  extractSubject,
  extractDate,
  isStatementEmail,
  getPdfAttachments,
} from './bankDetector.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of messages returned per Gmail API page. */
const PAGE_SIZE = 100;

/** Number of months back from today to include in the search window. */
const LOOKBACK_MONTHS = 6;

/** Maximum number of retry attempts for transient API errors. */
const MAX_RETRIES = 3;

/** Base delay (ms) for exponential back-off. Doubles on each retry. */
const RETRY_BASE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for `ms` milliseconds (used in back-off retry logic).
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format a Date as `YYYY/MM/DD` for use in Gmail search queries.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatDateForQuery(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * Determine whether an HTTP status code is worth retrying.
 *
 * @param {number} status
 * @returns {boolean}
 */
function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

// ---------------------------------------------------------------------------
// GmailScanner class
// ---------------------------------------------------------------------------

/**
 * Scans a user's Gmail inbox for Turkish bank credit card statement emails
 * and provides methods to retrieve attachment PDFs for parsing.
 *
 * @example
 * const scanner = new GmailScanner(req.user.accessToken);
 * const statements = await scanner.scanForStatements();
 * const pdfBuffer = await scanner.downloadAttachment(msgId, attachId);
 */
class GmailScanner {
  /**
   * @param {string} accessToken - Valid Google OAuth 2.0 access token with
   *   `gmail.readonly` scope.
   */
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error('GmailScanner: accessToken is required');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    /** @private */
    this._gmail = google.gmail({ version: 'v1', auth });

    /** @private — cached results from the last scanForStatements() call */
    this._lastScanResults = [];

    logger.info('GmailScanner: initialised with provided access token');
  }

  // -------------------------------------------------------------------------
  // Query builder
  // -------------------------------------------------------------------------

  /**
   * Build a Gmail search query that targets credit card statement emails from
   * all 15 known Turkish banks within the last 6 months.
   *
   * Query anatomy:
   *   - `from:(...)` — matches any of the known bank sender domains
   *   - `after:YYYY/MM/DD` — only emails after the 6-month lookback date
   *   - `has:attachment filename:pdf` — must contain a PDF attachment
   *
   * @returns {string} Gmail search query string
   */
  buildSearchQuery() {
    // Collect all unique sender domains across every bank in the registry
    const allDomains = [
      ...new Set(
        BANK_REGISTRY.flatMap((bank) => bank.senderDomains ?? [])
      ),
    ];

    // Build the "from" clause: from:(@domain1.com OR @domain2.com OR ...)
    const fromClause = `from:(${allDomains
      .map((d) => `@${d}`)
      .join(' OR ')})`;

    // Compute the lookback date (6 months ago, first day of that month)
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - LOOKBACK_MONTHS);
    cutoff.setDate(1);
    const afterClause = `after:${formatDateForQuery(cutoff)}`;

    // Attachment filter
    const attachmentClause = 'has:attachment filename:pdf';

    const query = `${fromClause} ${afterClause} ${attachmentClause}`;
    logger.info(`GmailScanner.buildSearchQuery: ${query}`);
    return query;
  }

  // -------------------------------------------------------------------------
  // Internal API call wrapper with retry / back-off
  // -------------------------------------------------------------------------

  /**
   * Execute a Gmail API call with exponential back-off retry logic.
   *
   * @private
   * @template T
   * @param {() => Promise<T>} apiFn - A zero-argument async function wrapping
   *   a single Gmail API call.
   * @param {string} [label='api call'] - Human-readable label for log messages.
   * @returns {Promise<T>}
   * @throws {Error} After all retries exhausted, or on a non-retryable error.
   */
  async _withRetry(apiFn, label = 'api call') {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await apiFn();
      } catch (err) {
        const status = err?.response?.status ?? err?.code ?? 0;
        lastError = err;

        if (!isRetryableStatus(status)) {
          // Non-retryable (e.g. 401 Unauthorized, 403 Forbidden, 404 …)
          logger.error(
            `GmailScanner._withRetry [${label}]: non-retryable error ${status} — ${err.message}`
          );
          throw err;
        }

        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(
          `GmailScanner._withRetry [${label}]: attempt ${attempt}/${MAX_RETRIES} ` +
          `failed with status ${status}. Retrying in ${delay}ms…`
        );
        await sleep(delay);
      }
    }

    logger.error(
      `GmailScanner._withRetry [${label}]: all ${MAX_RETRIES} attempts failed`
    );
    throw lastError;
  }

  // -------------------------------------------------------------------------
  // Message list with pagination
  // -------------------------------------------------------------------------

  /**
   * Fetch all message IDs matching the bank statement query, handling Gmail
   * API pagination transparently.
   *
   * @private
   * @returns {Promise<string[]>} Array of Gmail message IDs
   */
  async _listMatchingMessageIds() {
    const query = this.buildSearchQuery();
    const messageIds = [];
    let pageToken;

    do {
      const params = {
        userId: 'me',
        q: query,
        maxResults: PAGE_SIZE,
      };
      if (pageToken) params.pageToken = pageToken;

      const response = await this._withRetry(
        () => this._gmail.users.messages.list(params),
        'messages.list'
      );

      const data = response.data;
      const page = data.messages ?? [];
      for (const msg of page) {
        if (msg.id) messageIds.push(msg.id);
      }

      pageToken = data.nextPageToken ?? null;

      logger.info(
        `GmailScanner._listMatchingMessageIds: fetched ${page.length} IDs ` +
        `(total so far: ${messageIds.length}, hasMore: ${!!pageToken})`
      );
    } while (pageToken);

    return messageIds;
  }

  // -------------------------------------------------------------------------
  // Single message detail retrieval
  // -------------------------------------------------------------------------

  /**
   * Retrieve the full message payload for a single Gmail message ID.
   * Returns the raw Gmail API message object.
   *
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<Object>} Gmail message object (format: 'full')
   * @throws {Error} On API errors after retries
   */
  async getMessageDetails(messageId) {
    if (!messageId) throw new Error('getMessageDetails: messageId is required');

    const response = await this._withRetry(
      () =>
        this._gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        }),
      `messages.get(${messageId})`
    );

    return response.data;
  }

  // -------------------------------------------------------------------------
  // Attachment download
  // -------------------------------------------------------------------------

  /**
   * Download a PDF attachment from a Gmail message and return its raw bytes.
   *
   * Gmail stores attachment data as base64url-encoded strings. This method
   * fetches the attachment, decodes it, and returns a Node.js `Buffer`.
   *
   * @param {string} messageId    - Gmail message ID containing the attachment
   * @param {string} attachmentId - Attachment ID from the message payload
   * @returns {Promise<Buffer>} Raw PDF bytes
   * @throws {Error} If the attachment cannot be retrieved or decoded
   */
  async downloadAttachment(messageId, attachmentId) {
    if (!messageId) throw new Error('downloadAttachment: messageId is required');
    if (!attachmentId) throw new Error('downloadAttachment: attachmentId is required');

    const response = await this._withRetry(
      () =>
        this._gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId,
        }),
      `attachments.get(${messageId}, ${attachmentId})`
    );

    const { data: base64UrlData } = response.data;

    if (!base64UrlData) {
      throw new Error(
        `downloadAttachment: empty attachment data for messageId=${messageId}, attachmentId=${attachmentId}`
      );
    }

    // Gmail uses base64url encoding (RFC 4648 §5): replace - → + and _ → /
    const base64 = base64UrlData.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(base64, 'base64');

    logger.info(
      `downloadAttachment: downloaded ${buffer.length} bytes ` +
      `(messageId=${messageId}, attachmentId=${attachmentId})`
    );

    return buffer;
  }

  // -------------------------------------------------------------------------
  // Core scan logic
  // -------------------------------------------------------------------------

  /**
   * Scan the user's Gmail inbox for Turkish bank credit card statement emails
   * from the last 6 months.
   *
   * For each matching email the method:
   *   1. Verifies it is a statement (not promotional) via `isStatementEmail()`
   *   2. Identifies the sending bank via `detectBankFromMessage()`
   *   3. Collects PDF attachment metadata via `getPdfAttachments()`
   *   4. Flags İş Bankası emails (and any link-only email) as
   *      `requiresManualUpload: true` when no PDF attachment is found
   *
   * Results are cached internally so `listStatements()` can return them
   * without a second scan.
   *
   * @returns {Promise<Array<{
   *   messageId: string,
   *   bankId: string,
   *   bankName: string,
   *   confidence: string,
   *   subject: string,
   *   from: string,
   *   date: Date,
   *   hasAttachment: boolean,
   *   attachmentIds: string[],
   *   attachments: Array<{filename: string, attachmentId: string, size: number}>,
   *   requiresManualUpload: boolean,
   * }>>}
   */
  async scanForStatements() {
    logger.info('GmailScanner.scanForStatements: starting scan…');

    let messageIds;
    try {
      messageIds = await this._listMatchingMessageIds();
    } catch (err) {
      logger.error(`GmailScanner.scanForStatements: failed to list messages — ${err.message}`);
      throw err;
    }

    if (messageIds.length === 0) {
      logger.info('GmailScanner.scanForStatements: no matching messages found');
      this._lastScanResults = [];
      return [];
    }

    logger.info(
      `GmailScanner.scanForStatements: processing ${messageIds.length} candidate messages`
    );

    const statements = [];

    for (const messageId of messageIds) {
      try {
        const message = await this.getMessageDetails(messageId);

        // Filter: must look like a statement email (not promo)
        if (!isStatementEmail(message)) {
          logger.info(
            `GmailScanner.scanForStatements: skipping non-statement message ${messageId}`
          );
          continue;
        }

        // Identify the bank
        const bankInfo = detectBankFromMessage(message);
        if (!bankInfo) {
          // Cannot confidently identify the bank — skip
          logger.warn(
            `GmailScanner.scanForStatements: could not identify bank for message ${messageId}, skipping`
          );
          continue;
        }

        const sender = extractSenderEmail(message);
        const subject = extractSubject(message);
        const date = extractDate(message);
        const pdfAttachments = getPdfAttachments(message);

        const hasAttachment = pdfAttachments.length > 0;

        // İş Bankası (isbank) is known to sometimes send link-only emails
        // with no PDF. Flag any email with no PDF attachment for manual upload.
        const requiresManualUpload = !hasAttachment;

        if (requiresManualUpload) {
          logger.warn(
            `GmailScanner.scanForStatements: message ${messageId} from ${bankInfo.bankId} ` +
            `has no PDF attachment — flagged as requiresManualUpload`
          );
        }

        statements.push({
          messageId,
          bankId: bankInfo.bankId,
          bankName: bankInfo.bankName,
          confidence: bankInfo.confidence,
          subject,
          from: sender,
          date,
          hasAttachment,
          attachmentIds: pdfAttachments.map((a) => a.attachmentId),
          attachments: pdfAttachments,
          requiresManualUpload,
        });
      } catch (err) {
        // Per-message errors are logged but do not abort the scan
        logger.error(
          `GmailScanner.scanForStatements: error processing message ${messageId} — ` +
          `${err.message}`
        );
      }
    }

    logger.info(
      `GmailScanner.scanForStatements: scan complete — ` +
      `${statements.length} statements found from ${messageIds.length} candidates`
    );

    this._lastScanResults = statements;
    return statements;
  }

  // -------------------------------------------------------------------------
  // List statements (metadata only)
  // -------------------------------------------------------------------------

  /**
   * Return a list of all statement emails identified in the last scan.
   * Each item contains full metadata but no attachment data (no downloads).
   *
   * If `scanForStatements()` has not been called yet, this method will
   * trigger it automatically.
   *
   * @returns {Promise<Array>} Same shape as `scanForStatements()` return value
   */
  async listStatements() {
    if (this._lastScanResults.length === 0) {
      logger.info(
        'GmailScanner.listStatements: no cached results — triggering scanForStatements()'
      );
      return this.scanForStatements();
    }
    return this._lastScanResults;
  }
}

export default GmailScanner;
