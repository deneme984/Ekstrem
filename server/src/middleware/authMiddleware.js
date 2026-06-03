/**
 * @fileoverview Auth Middleware — Ekstrem v1.0
 *
 * `requireAuth` Express middleware that validates the user's session and
 * attaches `req.user` before downstream route handlers run.
 *
 * NOTE: This is a structural placeholder for the feature/gmail-scanner branch.
 * The full implementation (JWT verification, session management, Google OAuth
 * token refresh) will be provided by the Auth Security agent on the
 * feature/auth-security branch. This file provides the named `requireAuth`
 * export so routes can import it without errors during development.
 *
 * Expected `req.user` shape once fully implemented:
 * ```js
 * {
 *   id: string,          // Internal user ID
 *   sub: string,         // Google OAuth subject
 *   email: string,
 *   accessToken: string, // Google OAuth 2.0 access token (gmail.readonly scope)
 * }
 * ```
 */

import logger from '../utils/logger.js';

/**
 * Middleware that verifies the request has a valid auth session.
 * Attaches `req.user` containing the authenticated user's info and
 * their Google OAuth access token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  // Placeholder: Auth Security agent will implement JWT/session verification.
  // For now, pass through and let individual controllers validate accessToken.
  logger.debug(`requireAuth: ${req.method} ${req.path}`);
  next();
}

export default requireAuth;
