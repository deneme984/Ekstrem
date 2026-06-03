import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

// Auth controller implemented by the Auth & Security agent.
// Graceful fallback so server starts before that agent's work lands.
let authController = {};
try {
  ({ default: authController } = await import('../controllers/authController.js'));
} catch {
  // Controller not yet fully implemented — stubs serve 501 until ready
}

function notImplemented(name) {
  return (_req, res) => res.status(501).json({ error: `${name} henüz uygulanmadı.` });
}

const {
  googleRedirect = notImplemented('googleRedirect'),
  googleCallback = notImplemented('googleCallback'),
  refreshToken   = notImplemented('refreshToken'),
  logout         = notImplemented('logout'),
  me             = notImplemented('me'),
} = authController;

const router = Router();

// GET /api/auth/google
// Redirect user to Google OAuth2 consent screen
router.get('/google', googleRedirect);

// GET /api/auth/google/callback
// Google redirects here after user consent — exchanges code for tokens
router.get('/google/callback', googleCallback);

// POST /api/auth/refresh
// Use a stored refresh token to get a new access token
router.post('/refresh', refreshToken);

// POST /api/auth/logout
// Revoke access token and clear session (requires valid token)
router.post('/logout', requireAuth, logout);

// GET /api/auth/me
// Return current user's profile info (requires valid token)
router.get('/me', requireAuth, me);

export default router;
