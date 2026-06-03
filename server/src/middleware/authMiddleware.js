import logger from '../utils/logger.js';

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

/**
 * Validates a Google access token via Google's tokeninfo endpoint.
 * @param {string} accessToken
 * @returns {Promise<object>} tokenInfo
 */
async function verifyGoogleToken(accessToken) {
  const url = `${GOOGLE_TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw Object.assign(new Error('invalid_token'), { tokenError: data.error });
  }

  return data;
}

/**
 * requireAuth middleware
 * Validates Bearer token from Authorization header.
 * Attaches req.user = { googleId, email, accessToken } on success.
 * Returns 401 JSON on failure.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' });
  }

  try {
    const tokenInfo = await verifyGoogleToken(accessToken);

    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (expectedClientId && tokenInfo.aud !== expectedClientId) {
      logger.warn('Token audience mismatch', {
        expected: expectedClientId,
        received: tokenInfo.aud,
      });
      return res.status(401).json({ error: 'Oturumunuz sona erdi. Tekrar giriş yapın.' });
    }

    req.user = {
      googleId:    tokenInfo.sub,
      email:       tokenInfo.email,
      accessToken,
    };

    next();
  } catch (err) {
    logger.warn('Token verification failed', { message: err.message });
    return res.status(401).json({ error: 'Oturumunuz sona erdi. Tekrar giriş yapın.' });
  }
}

/**
 * optionalAuth middleware
 * Same as requireAuth but never blocks. Sets req.user = null if no/invalid token.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    req.user = null;
    return next();
  }

  try {
    const tokenInfo = await verifyGoogleToken(accessToken);

    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    if (expectedClientId && tokenInfo.aud !== expectedClientId) {
      req.user = null;
      return next();
    }

    req.user = {
      googleId:    tokenInfo.sub,
      email:       tokenInfo.email,
      accessToken,
    };
  } catch {
    req.user = null;
  }

  next();
}

export default requireAuth;
