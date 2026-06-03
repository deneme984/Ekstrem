/**
 * Auth Middleware — Ekstrem v1.0
 * 
 * Validates Google OAuth access tokens on protected routes.
 * Sets req.user with decoded user info after successful validation.
 * 
 * SECURITY NOTES:
 * - Tokens are validated against Google's tokeninfo endpoint
 * - On validation failure, returns 401 — never leaks token details in response
 * - Token values are NEVER logged
 */

import { validateToken } from '../services/auth/googleAuth.js';
import logger from '../utils/logger.js';

/**
 * requireAuth middleware
 * 
 * Extracts Bearer token from Authorization header, validates it,
 * and populates req.user. Responds 401 if not authenticated.
 * 
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Kimlik doğrulama gerekli',
      code: 'MISSING_TOKEN',
    });
  }

  // Extract token (NEVER log this value)
  const encodedToken = authHeader.slice(7).trim();

  if (!encodedToken) {
    return res.status(401).json({
      error: 'Geçersiz token formatı',
      code: 'INVALID_TOKEN_FORMAT',
    });
  }

  try {
    // Decode base64 token sent from client localStorage
    const token = Buffer.from(encodedToken, 'base64').toString('utf8');

    // Validate with Google
    const userInfo = await validateToken(token);

    // Attach user info to request (safe to use downstream)
    req.user = userInfo;

    logger.info('Request authenticated', { email: userInfo.email, path: req.path });
    next();
  } catch (err) {
    logger.warn('Token validation failed', { message: err.message, path: req.path });

    const isExpired = err?.message?.includes('expired') || err?.message?.includes('invalid');

    return res.status(401).json({
      error: isExpired ? 'Oturum süresi doldu, lütfen tekrar giriş yapın' : 'Kimlik doğrulama başarısız',
      code: isExpired ? 'TOKEN_EXPIRED' : 'AUTH_FAILED',
    });
  }
}

/**
 * optionalAuth middleware
 * 
 * Like requireAuth but does NOT block the request if no token is present.
 * Sets req.user if token is valid, otherwise leaves it undefined.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const encodedToken = authHeader.slice(7).trim();
  if (!encodedToken) return next();

  try {
    const token = Buffer.from(encodedToken, 'base64').toString('utf8');
    const userInfo = await validateToken(token);
    req.user = userInfo;
  } catch {
    // Silent fail — optionalAuth doesn't block
  }

  next();
}

export { requireAuth, optionalAuth };
