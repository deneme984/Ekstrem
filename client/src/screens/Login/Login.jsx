import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const { loginWithGoogle, isLoading, error, isAuthenticated, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    clearError();
    loginWithGoogle();
  };

  return (
    <div className="login-screen">
      {/* Animated background glow orbs */}
      <div className="login-bg-glow" aria-hidden="true">
        <div className="login-glow-orb login-glow-orb--1" />
        <div className="login-glow-orb login-glow-orb--2" />
        <div className="login-glow-orb login-glow-orb--3" />
      </div>

      <div className="login-content animate-fade-in-up">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <span className="login-logo-letter">E</span>
          </div>
          <h1 className="login-app-name">Ekstrem</h1>
          <p className="login-tagline">
            Tüm kartlarınız.{' '}
            <span className="login-tagline-accent">Tek ekranda.</span>
          </p>
        </div>

        {/* Subtitle */}
        <p className="login-subtitle">
          Gmail hesabınızla güvenli giriş yapın
        </p>

        {/* Error message */}
        {error && (
          <div className="login-error animate-fade-in" role="alert">
            <span className="login-error-dot" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          className="login-google-btn press-feedback"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          aria-label="Google ile giriş yap"
        >
          {isLoading ? (
            <span className="spinner spinner-sm" aria-label="Yükleniyor" />
          ) : (
            <GoogleLogo />
          )}
          <span className="login-google-btn-text">
            {isLoading ? 'Yönlendiriliyor…' : 'Google ile devam et'}
          </span>
        </button>

        {/* Privacy note */}
        <div className="login-privacy">
          <Shield size={14} className="login-privacy-icon" aria-hidden="true" />
          <p className="login-privacy-text">
            Yalnızca kredi kartı ekstrelerinizi okuruz.
            <br />
            Başka bir şeye dokunmayız.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg
      className="login-google-logo"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
