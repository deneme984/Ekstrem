/**
 * Google OAuth 2.0 Service
 *
 * Handles the full OAuth lifecycle:
 *   - OAuth2 client creation
 *   - Consent URL generation
 *   - Authorization code → token exchange
 *   - Access token refresh
 *   - Token revocation (logout)
 *   - Token validation via Google tokeninfo API
 *   - User profile fetch
 *
 * SECURITY RULES (enforced throughout this file):
 *
 * 1. TOKENS NEVER LOGGED — access tokens, refresh tokens, and authorization
 *    codes are NEVER passed to the logger. Only non-sensitive metadata is logged
 *    (e.g., email, expiry timestamps, boolean validity flags).
 *
 * 2. TCKN NEVER STORED — Turkish national ID numbers (TCKN) are used only
 *    in-memory during a single PDF decrypt operation and are NEVER stored,
 *    cached, logged, or persisted anywhere on the server. The TCKN is accepted
 *    in the request body for that specific operation only, used once, and
 *    immediately discarded.
 *
 * 3. TOKEN AUDIENCE VALIDATION — validateToken() checks that the token's
 *    audience (aud) matches our GOOGLE_CLIENT_ID, preventing confused-deputy
 *    attacks where tokens issued to other apps are accepted.
 *
 * 4. REDIRECT URI VALIDATION — the redirect URI is sourced exclusively from
 *    GOOGLE_REDIRECT_URI env var and never overridden by user input.
 *
 * MVP NOTE:
 *   Refresh tokens are returned to the client and stored in localStorage.
 *   In production, refresh tokens should ONLY be stored server-side in an
 *   httpOnly, Secure, SameSite=Strict cookie or a server-side session store.
 *   localStorage is acceptable only for this MVP prototype.
 */

import { google } from 'googleapis';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// OAuth 2.0 Scopes
// ---------------------------------------------------------------------------

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads required env vars and throws with a safe message if missing.
 * Never logs the actual values.
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates and returns a configured Google OAuth2 client instance.
 *
 * @returns {import('google-auth-library').OAuth2Client}
 */
function createOAuthClient() {
  const clientId     = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const redirectUri  = requireEnv('GOOGLE_REDIRECT_URI');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google consent-page URL.
 * - access_type: 'offline' → Google issues a refresh token on first consent
 * - prompt: 'consent' → Always show consent screen to guarantee refresh token delivery
 *
 * @returns {string} Full URL to redirect the user to
 */
function generateAuthUrl() {
  const oauth2Client = createOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       SCOPES,
  });

  logger.info('Generated Google OAuth consent URL', { scopeCount: SCOPES.length });
  return url;
}

/**
 * Exchanges a one-time authorization code for tokens and user profile.
 *
 * @param {string} code - Authorization code received from Google callback
 * @returns {Promise<{
 *   accessToken: string,
 *   refreshToken: string | null,
 *   expiryDate: number,
 *   userInfo: { googleId: string, email: string, name: string, picture: string }
 * }>}
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuthClient();

  // SECURITY: code is intentionally not logged
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  logger.info('Authorization code exchanged for tokens', {
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate:      tokens.expiry_date,
  });

  // Fetch user profile
  const userInfo = await getUserInfo(tokens.access_token);

  return {
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiryDate:   tokens.expiry_date,
    userInfo,
  };
}

/**
 * Uses a refresh token to obtain a new access token.
 *
 * @param {string} refreshToken - The stored refresh token
 * @returns {Promise<{ accessToken: string, expiryDate: number }>}
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuthClient();

  // SECURITY: refreshToken is intentionally not logged
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  logger.info('Access token refreshed successfully', {
    expiryDate: credentials.expiry_date,
  });

  return {
    accessToken: credentials.access_token,
    expiryDate:  credentials.expiry_date,
  };
}

/**
 * Revokes a token (access or refresh) at Google's servers.
 * Called on user logout to invalidate the session.
 *
 * @param {string} token - Access token or refresh token to revoke
 * @returns {Promise<void>}
 */
async function revokeToken(token) {
  const oauth2Client = createOAuthClient();

  // SECURITY: token is intentionally not logged
  try {
    await oauth2Client.revokeToken(token);
    logger.info('Token revoked successfully at Google');
  } catch (err) {
    // Log failure without exposing the token itself
    logger.warn('Token revocation failed (may already be expired)', {
      errorCode: err?.code ?? 'unknown',
    });
    // Don't rethrow — treat as best-effort on logout
  }
}

/**
 * Validates an access token by calling Google's tokeninfo endpoint.
 * Also verifies the audience (aud) matches our CLIENT_ID to prevent
 * confused-deputy / token substitution attacks.
 *
 * @param {string} accessToken - Access token to validate
 * @returns {Promise<{ valid: boolean, email?: string, expiresIn?: number }>}
 */
async function validateToken(accessToken) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');

  try {
    const oauth2Client = createOAuthClient();

    // Use Google's OAuth2 tokeninfo endpoint
    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);

    // Audience check — reject tokens issued to other OAuth clients
    if (tokenInfo.aud !== clientId) {
      logger.warn('Token audience mismatch — possible confused-deputy attack', {
        expectedAud: clientId,
        receivedAud: tokenInfo.aud,
      });
      return { valid: false };
    }

    const expiresIn = tokenInfo.expiry_date
      ? Math.floor((tokenInfo.expiry_date - Date.now()) / 1000)
      : undefined;

    logger.info('Token validated successfully', {
      email:     tokenInfo.email,
      expiresIn,
    });

    return {
      valid:     true,
      email:     tokenInfo.email,
      expiresIn,
    };
  } catch {
    // SECURITY: never expose validation error details externally
    logger.info('Token validation failed — token invalid or expired');
    return { valid: false };
  }
}

/**
 * Fetches the authenticated user's Google profile information.
 *
 * @param {string} accessToken - Valid access token
 * @returns {Promise<{ googleId: string, email: string, name: string, picture: string }>}
 */
async function getUserInfo(accessToken) {
  const oauth2Client = createOAuthClient();

  // SECURITY: accessToken is intentionally not logged
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  logger.info('User profile fetched', { email: data.email });

  return {
    googleId: data.id,
    email:    data.email,
    name:     data.name,
    picture:  data.picture,
  };
}

export {
  createOAuthClient,
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  validateToken,
  getUserInfo,
};
