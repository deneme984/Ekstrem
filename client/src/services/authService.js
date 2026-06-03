import api from './api.js';

/**
 * Redirects user to Google OAuth consent screen via the backend.
 */
export function initiateGoogleLogin() {
  window.location.href = '/api/auth/google';
}

/**
 * Exchanges OAuth authorization code for tokens.
 * @param {string} code - Authorization code from Google
 * @returns {Promise<Object>} User and token data
 */
export async function handleCallback(code) {
  const response = await api.post('/auth/google/callback', { code });
  return response.data;
}

/**
 * Refreshes the access token using a refresh token.
 * @param {string} refreshToken - The stored refresh token
 * @returns {Promise<Object>} New token data
 */
export async function refreshToken(refreshToken) {
  const response = await api.post('/auth/refresh', { refreshToken });
  return response.data;
}

/**
 * Logs the current user out on the server.
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('ekstrem_auth');
  }
}

/**
 * Fetches the currently authenticated user's profile.
 * @returns {Promise<Object>} User profile data
 */
export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}
