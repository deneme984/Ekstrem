/**
 * @fileoverview Bank Email Detector — Ekstrem v1.0
 *
 * Standalone utility functions for identifying which Turkish bank sent a
 * credit card statement email. Operates on raw Gmail API message objects
 * (the full `users.messages.get` response with `format: 'full'`).
 *
 * All detection logic delegates to the canonical bank registry in
 * `server/src/config/banks.js`, keeping this module thin and testable.
 */

import {
  detectBankFromEmail,
  isCreditCardStatement,
  BANK_REGISTRY,
  BANK_BY_ID,
} from '../../config/banks.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Header extraction helpers
// ---------------------------------------------------------------------------

/**
 * Safely retrieve a named header value from a Gmail message object.
 *
 * @param {Object} gmailMessage - Full Gmail message object (format: 'full')
 * @param {string} headerName   - Case-insensitive header name to find
 * @returns {string} Header value or empty string if not found
 */
function getHeader(gmailMessage, headerName) {
  try {
    const headers = gmailMessage?.payload?.headers ?? [];
    const lower = headerName.toLowerCase();
    const found = headers.find((h) => h.name.toLowerCase() === lower);
    return found?.value ?? '';
  } catch (err) {
    logger.warn(`getHeader: failed to read "${headerName}" — ${err.message}`);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Public extraction utilities
// ---------------------------------------------------------------------------

/**
 * Safely extract the sender's email address from a Gmail message object.
 * Handles both plain `user@domain.com` and display-name formats
 * like `"Bank Name" <user@domain.com>`.
 *
 * @param {Object} gmailMessage - Full Gmail message object
 * @returns {string} Sender email address (lower-cased), or empty string
 */
function extractSenderEmail(gmailMessage) {
  const fromHeader = getHeader(gmailMessage, 'From');
  if (!fromHeader) return '';

  // Extract email from angle-bracket format: "Name <email>"
  const angleMatch = fromHeader.match(/<([^>]+)>/);
  if (angleMatch) return angleMatch[1].toLowerCase().trim();

  // Fallback: the entire From value is the email
  return fromHeader.toLowerCase().trim();
}

/**
 * Safely extract the subject line from a Gmail message object.
 *
 * @param {Object} gmailMessage - Full Gmail message object
 * @returns {string} Subject string, or empty string
 */
function extractSubject(gmailMessage) {
  return getHeader(gmailMessage, 'Subject');
}

/**
 * Extract and parse the send date from a Gmail message's `internalDate`.
 * `internalDate` is a Unix epoch in milliseconds (as a string).
 *
 * @param {Object} gmailMessage - Full Gmail message object
 * @returns {Date} JavaScript Date, or `new Date(0)` if unavailable
 */
function extractDate(gmailMessage) {
  try {
    const ts = gmailMessage?.internalDate;
    if (!ts) return new Date(0);
    return new Date(parseInt(ts, 10));
  } catch (err) {
    logger.warn(`extractDate: failed — ${err.message}`);
    return new Date(0);
  }
}

// ---------------------------------------------------------------------------
// MIME attachment helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walk the MIME tree of a Gmail message payload and collect all
 * PDF attachment parts.
 *
 * The Gmail API represents emails as a tree of `parts` objects. Each part
 * may itself contain nested `parts` for multipart messages. A part is an
 * attachment when it has a non-empty `filename` and a `body.attachmentId`.
 *
 * @param {Object} gmailMessage - Full Gmail message object (format: 'full')
 * @returns {Array<{filename: string, attachmentId: string, size: number}>}
 */
function getPdfAttachments(gmailMessage) {
  const results = [];

  /**
   * @param {Object} part - A Gmail MIME part
   */
  function walk(part) {
    if (!part) return;

    const mimeType = (part.mimeType ?? '').toLowerCase();
    const filename = (part.filename ?? '').toLowerCase();
    const attachmentId = part.body?.attachmentId;
    const size = part.body?.size ?? 0;

    // It's a PDF attachment if it has an attachmentId and either:
    //  - mimeType is application/pdf, OR
    //  - filename ends with .pdf
    const isPdf =
      mimeType === 'application/pdf' ||
      filename.endsWith('.pdf');

    if (attachmentId && isPdf) {
      results.push({
        filename: part.filename ?? 'attachment.pdf',
        attachmentId,
        size,
      });
    }

    // Recurse into multipart children
    if (Array.isArray(part.parts)) {
      for (const child of part.parts) {
        walk(child);
      }
    }
  }

  try {
    walk(gmailMessage?.payload);
  } catch (err) {
    logger.warn(`getPdfAttachments: error walking MIME tree — ${err.message}`);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Core detection logic
// ---------------------------------------------------------------------------

/**
 * Determine whether a Gmail message is a credit card statement email
 * (ekstre), as opposed to a promotional or general notification email.
 *
 * Delegates to `isCreditCardStatement()` from the bank registry.
 *
 * @param {Object} gmailMessage - Full Gmail message object
 * @returns {boolean}
 */
function isStatementEmail(gmailMessage) {
  const subject = extractSubject(gmailMessage);
  return isCreditCardStatement(subject);
}

/**
 * Identify which Turkish bank sent a Gmail message by analysing the sender
 * address and subject line.
 *
 * Detection priority (most → least reliable):
 *   1. Exact sender email match (HIGH confidence)
 *   2. Sender domain match     (HIGH confidence)
 *   3. Subject keyword match   (MEDIUM confidence)
 *
 * @param {Object} gmailMessage - Full Gmail message object (format: 'full')
 * @returns {{ bankId: string, confidence: string, bankName: string, method: string } | null}
 *   Returns `null` when no bank can be identified.
 */
function detectBankFromMessage(gmailMessage) {
  const sender = extractSenderEmail(gmailMessage);
  const subject = extractSubject(gmailMessage);

  const result = detectBankFromEmail(sender, subject);

  if (!result.bankId) {
    logger.info(
      `detectBankFromMessage: no bank identified for sender="${sender}", subject="${subject}"`
    );
    return null;
  }

  const bankEntry = BANK_BY_ID[result.bankId];
  const bankName = bankEntry?.bankName ?? result.bankId;

  logger.info(
    `detectBankFromMessage: identified ${bankName} (${result.confidence}) via ${result.method}`
  );

  return {
    bankId: result.bankId,
    confidence: result.confidence,
    bankName,
    method: result.method,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  detectBankFromMessage,
  extractSenderEmail,
  extractSubject,
  extractDate,
  isStatementEmail,
  getPdfAttachments,
};
