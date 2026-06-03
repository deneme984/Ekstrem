/**
 * @fileoverview Gmail Routes — Ekstrem v1.0
 *
 * Mounts all Gmail-related API endpoints under a shared Express router.
 * Intended to be mounted at `/api/gmail` in the Express application.
 *
 * All routes are protected by `requireAuth` middleware, which validates
 * the user's session and attaches `req.user` (including `accessToken`)
 * before any route handler executes.
 *
 * Route map:
 *   POST   /api/gmail/scan               → scanGmail
 *   GET    /api/gmail/scan/status        → getScanStatus
 *   GET    /api/gmail/statements         → listStatements
 *   POST   /api/gmail/statements/parse   → parseStatements
 */

import { Router } from 'express';
import {
  scanGmail,
  getScanStatus,
  listStatements,
  parseStatements,
} from '../controllers/gmailController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /scan
 *
 * Trigger a Gmail inbox scan for Turkish bank credit card statement emails.
 * Requires `gmail.readonly` OAuth 2.0 scope on the access token.
 *
 * Body: (none required)
 * Response: { found: number, banks: string[], statements: StatementMeta[] }
 */
router.post('/scan', requireAuth, scanGmail);

/**
 * GET /scan/status
 *
 * Poll the current scan progress for the authenticated user.
 *
 * Response: { status: string, startedAt: number|null, found: number, banks: string[] }
 */
router.get('/scan/status', requireAuth, getScanStatus);

/**
 * GET /statements
 *
 * Retrieve the list of statement emails found in the most recent scan.
 * Returns metadata only; no PDFs are downloaded.
 *
 * Response: { statements: StatementMeta[], found: number, scanRequired: boolean }
 */
router.get('/statements', requireAuth, listStatements);

/**
 * POST /statements/parse
 *
 * Download and parse PDF attachments from the found statement emails.
 * Optionally accepts { messageIds: string[] } in the request body to limit
 * parsing to specific messages.
 *
 * Response: { cards: Card[], statements: Statement[], transactions: Transaction[], skipped: [] }
 */
router.post('/statements/parse', requireAuth, parseStatements);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default router;
