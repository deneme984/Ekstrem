import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initiateGoogleLogin,
  handleCallback as authHandleCallback,
  refreshToken as authRefreshToken,
  logout as authLogout,
  getCurrentUser,
} from '../services/authService.js';

const STORAGE_KEY = 'ekstrem_auth';

/**
 * Auth state shape:
 * {
 *   user: { googleId, email, name, picture, accessToken } | null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   error: string | null,
 * }
 */

const AuthContext = createContext(null);

function loadAuthFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveAuthToStorage(authData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
  } catch {
    // storage quota exceeded or private mode
  }
}

function clearAuthStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresAt) => {
    if (!expiresAt) return;
    const now = Date.now();
    const msUntilExpiry = expiresAt - now;
    const msUntilRefresh = msUntilExpiry - 60_000;
    if (msUntilRefresh <= 0) return;

    clearRefreshTimer();
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const stored = loadAuthFromStorage();
        if (!stored?.refreshToken) return;
        const data = await authRefreshToken(stored.refreshToken);
        const updated = { ...stored, ...data };
        saveAuthToStorage(updated);
        setUser(updated);
        scheduleTokenRefresh(updated.expiresAt);
      } catch {
        // Refresh failed — user will be logged out on next 401
      }
    }, msUntilRefresh);
  }, [clearRefreshTimer]);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    const stored = loadAuthFromStorage();

    if (!stored) {
      setIsLoading(false);
      return;
    }

    // Optimistically set auth state, then validate with server
    setUser(stored);
    setIsAuthenticated(true);

    try {
      const serverUser = await getCurrentUser();
      const merged = { ...stored, ...serverUser };
      setUser(merged);
      saveAuthToStorage(merged);
      scheduleTokenRefresh(merged.expiresAt);
    } catch {
      // Token invalid — try refresh
      try {
        if (stored.refreshToken) {
          const data = await authRefreshToken(stored.refreshToken);
          const refreshed = { ...stored, ...data };
          setUser(refreshed);
          saveAuthToStorage(refreshed);
          scheduleTokenRefresh(refreshed.expiresAt);
        } else {
          throw new Error('No refresh token');
        }
      } catch {
        clearAuthStorage();
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    initAuth();
    return () => clearRefreshTimer();
  }, [initAuth, clearRefreshTimer]);

  const loginWithGoogle = useCallback(() => {
    setError(null);
    initiateGoogleLogin();
  }, []);

  const handleOAuthCallback = useCallback(async (code) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authHandleCallback(code);
      const authData = {
        googleId:     data.user?.googleId,
        email:        data.user?.email,
        name:         data.user?.name,
        picture:      data.user?.picture,
        accessToken:  data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt:    data.expiresAt,
      };
      saveAuthToStorage(authData);
      setUser(authData);
      setIsAuthenticated(true);
      scheduleTokenRefresh(authData.expiresAt);
    } catch (err) {
      const message = err.response?.data?.message || 'Giriş başarısız oldu. Lütfen tekrar deneyin.';
      setError(message);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleTokenRefresh]);

  const logout = useCallback(async () => {
    clearRefreshTimer();
    setIsLoading(true);
    try {
      await authLogout();
    } finally {
      clearAuthStorage();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
    }
  }, [clearRefreshTimer]);

  const refreshTokenManually = useCallback(async () => {
    const stored = loadAuthFromStorage();
    if (!stored?.refreshToken) return;
    try {
      const data = await authRefreshToken(stored.refreshToken);
      const updated = { ...stored, ...data };
      saveAuthToStorage(updated);
      setUser(updated);
      scheduleTokenRefresh(updated.expiresAt);
    } catch (err) {
      setError(err.response?.data?.message || 'Oturum yenilenemedi.');
    }
  }, [scheduleTokenRefresh]);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginWithGoogle,
    handleOAuthCallback,
    logout,
    refreshToken: refreshTokenManually,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
