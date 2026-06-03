/**
 * Auth Controller
 *
 * Handles HTTP request/response for all OAuth 2.0 authentication endpoints:
 *   GET  /api/auth/google          → initiateGoogleAuth
 *   GET  /api/auth/google/callback → handleGoogleCallback
 *   POST /api/auth/refresh         → refreshToken
 *   POST /api/auth/logout          → logout
 *   GET  /api/auth/me              → getMe (requires authMiddleware)
 *
 * SECURITY RULES (enforced throughout this file):
 *
 * 1. TOKENS NEVER LOGGED — access tokens, refresh tokens, and authorization
 *    codes received from Google are NEVER passed to logger or included in any
 *    log output. Only opaque metadata (email, expiry timestamps) is logged.
 *
 * 2. TCKN NEVER STORED — The Turkish national ID (TCKN) is used exclusively
 *    in the PDF parser route for decrypting bank statement PDFs. It is accepted
 *    in the request body for that specific operation only, used in-memory, and
 *    immediately discarded. This controller never handles TCKN. If a future
 *    controller method receives a TCKN, it must NEVER log, cache, or persist it.
 *
 * 3. ERROR MESSAGES — error responses never leak internal stack traces,
 *    token values, or Google API error details to the client.
 *
 * 4. REDIRECT URI INTEGRITY — the callback redirects only to the frontend
 *    origin defined in env (FRONTEND_ORIGIN), never to a user-supplied URL.
 *
 * 5. MVP vs PRODUCTION token storage:
 *    - MVP (current): tokens returned in redirect URL fragment and stored in
 *      client-side localStorage. Acceptable for prototype/demo only.
 *    - PRODUCTION: refresh tokens must be stored in httpOnly, Secure,
 *      SameSite=Strict cookies or a server-side session/database store.
 *      Access tokens should be short-lived JWTs; refresh tokens must never
 *      be accessible to JavaScript (i.e., not in localStorage).
 *
 * RATE LIMITING NOTE:
 *   /api/auth/google and /api/auth/google/callback should be protected by an
 *   IP-based rate limiter (e.g., express-rate-limit) in production to prevent
 *   brute-force and DoS attacks. Implementation left for the infrastructure layer.
 */

import {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken as googleRefreshAccessToken,
  revokeToken,
} from '../services/auth/googleAuth.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Frontend origin to redirect back to after OAuth callback. */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Controller methods
// ---------------------------------------------------------------------------

/**
 * Initiates the Google OAuth flow.
 *
 * GET /api/auth/google
 * Generates a Google consent-page URL and redirects the user to it.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function initiateGoogleAuth(req, res) {
  try {
    const authUrl = generateAuthUrl();
    logger.info('Redirecting user to Google consent page');
    res.redirect(authUrl);
  } catch (err) {
    logger.error('Failed to generate Google OAuth URL', { message: err.message });
    res.status(500).json({ error: 'Authentication service unavailable. Please try again.' });
  }
}

/**
 * Handles the Google OAuth callback.
 *
 * GET /api/auth/google/callback?code=...
 * Exchanges the authorization code for tokens and redirects to the frontend.
 *
 * The access token and refresh token are placed in the URL fragment (#) so
 * they are never sent to the server on subsequent requests (fragment is
 * client-only). This is the MVP approach — see MVP NOTE above.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function handleGoogleCallback(req, res) {
  const { code, error: oauthError } = req.query;

  // Handle user-denied consent or other OAuth errors
  if (oauthError) {
    logger.warn('Google OAuth callback returned an error', { oauthError });
    return res.redirect(`${FRONTEND_ORIGIN}/auth/callback?error=access_denied`);
  }

  if (!code || typeof code !== 'string' || code.trim() === '') {
    logger.warn('Google OAuth callback missing authorization code');
    return res.redirect(`${FRONTEND_ORIGIN}/auth/callback?error=missing_code`);
  }

  try {
    // SECURITY: `code` is intentionally not logged
    const { accessToken, refreshToken, expiryDate, userInfo } =
      await exchangeCodeForTokens(code);

    logger.info('OAuth callback successful — redirecting to frontend', {
      email: userInfo.email,
    });

    // Encode tokens as base64 for URL safety.
    // MVP: stored in localStorage. Production: use httpOnly cookies instead.
    const encodedAccess  = Buffer.from(accessToken).toString('base64');
    const encodedRefresh = refreshToken
      ? Buffer.from(refreshToken).toString('base64')
      : '';

    // Encode non-sensitive user info for the frontend
    const userParam = encodeURIComponent(JSON.stringify({
      googleId: userInfo.googleId,
      email:    userInfo.email,
      name:     userInfo.name,
      picture:  userInfo.picture,
    }));

    // Fragment (#) keeps tokens out of server logs and Referer headers
    res.redirect(
      `${FRONTEND_ORIGIN}/auth/callback` +
      `#token=${encodedAccess}` +
      `&refresh=${encodedRefresh}` +
      `&expiry=${expiryDate ?? ''}` +
      `&user=${userParam}`
    );
  } catch (err) {
    // Distinguish between invalid/expired code vs unexpected server errors
    const isInvalidCode = err?.message?.includes('invalid_grant') ||
                          err?.message?.includes('invalid_client');

    logger.error('OAuth code exchange failed', { message: err.message });

    const errorCode = isInvalidCode ? 'invalid_code' : 'auth_failed';
    res.redirect(`${FRONTEND_ORIGIN}/auth/callback?error=${errorCode}`);
  }
}

/**
 * Refreshes an expired access token using a refresh token.
 *
 * POST /api/auth/refresh
 * Body: { refreshToken: string (base64-encoded) }
 * Response: { accessToken: string (base64-encoded), expiryDate: number }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function refreshToken(req, res) {
  const { refreshToken: encodedRefreshToken } = req.body;

  if (!encodedRefreshToken || typeof encodedRefreshToken !== 'string') {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    // Decode the base64 token sent from localStorage
    // SECURITY: decoded value is intentionally not logged
    const decoded = Buffer.from(encodedRefreshToken, 'base64').toString('utf8');

    const { accessToken, expiryDate } = await googleRefreshAccessToken(decoded);

    logger.info('Access token refreshed for client', { expiryDate });

    // Re-encode the new access token for the client
    const encodedAccess = Buffer.from(accessToken).toString('base64');

    res.json({
      accessToken: encodedAccess,
      expiryDate,
    });
  } catch (err) {
    logger.error('Token refresh failed', { message: err.message });

    // Determine if the refresh token has been revoked or is expired
    const isRevoked = err?.message?.includes('invalid_grant') ||
                      err?.message?.includes('Token has been expired');

    if (isRevoked) {
      return res.status(401).json({
        error: 'Session expired. Please sign in again.',
        code:  'REFRESH_TOKEN_REVOKED',
      });
    }

    res.status(500).json({ error: 'Failed to refresh session. Please try again.' });
  }
}

/**
 * Logs the user out by revoking their token at Google.
 *
 * POST /api/auth/logout
 * Body: { token: string (base64-encoded access or refresh token) }
 * Response: { success: true }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
async function logout(req, res) {
  const { token: encodedToken } = req.body;

  if (!encodedToken || typeof encodedToken !== 'string') {
    // Still return success — client should clear localStorage regardless
    logger.warn('Logout called without a token — clearing client session only');
    return res.json({ success: true });
  }

  try {
    // SECURITY: decoded token is intentionally not logged
    const decoded = Buffer.from(encodedToken, 'base64').toString('utf8');
    await revokeToken(decoded);
    logger.info('User logged out — token revoked at Google');
  } catch {
    // revokeToken is best-effort; always return success to client
    logger.warn('Token revocation encountered an error during logout — session cleared client-side');
  }

  res.json({ success: true });
}

/**
 * Returns the currently authenticated user's profile.
 *
 * GET /api/auth/me
 * Requires: authMiddleware (sets req.user after token validation)
 * Response: { googleId, email, name, picture }
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
function getMe(req, res) {
  // req.user is populated by authMiddleware after validateToken()
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  logger.info('User profile requested', { email: req.user.email });

  res.json(req.user);
}

export { initiateGoogleAuth, handleGoogleCallback, refreshToken, logout, getMe };
