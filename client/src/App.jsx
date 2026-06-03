import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CardsProvider } from './context/CardsContext.jsx';
import { StatementsProvider } from './context/StatementsContext.jsx';
import BottomNav from './components/BottomNav/BottomNav.jsx';
import Login from './screens/Login/Login.jsx';
import Dashboard from './screens/Dashboard/Dashboard.jsx';
import Spending from './screens/Spending/Spending.jsx';
import Installments from './screens/Installments/Installments.jsx';
import Analytics from './screens/Analytics/Analytics.jsx';
import Cards from './screens/Cards/Cards.jsx';

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Shows a centered spinner while auth is loading to avoid flash.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="screen flex-center">
        <span className="spinner spinner-lg" aria-label="Yükleniyor" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * AppLayout — wraps every protected screen with the bottom navigation bar.
 * Uses .screen and .screen-content from layout.css.
 */
function AppLayout({ children }) {
  return (
    <div className="screen">
      <div className="screen-content">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

/**
 * AppRoutes — route definitions.
 * Authenticated users are redirected away from /login automatically.
 */
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/spending"
        element={
          <ProtectedRoute>
            <AppLayout><Spending /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/installments"
        element={
          <ProtectedRoute>
            <AppLayout><Installments /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppLayout><Analytics /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cards"
        element={
          <ProtectedRoute>
            <AppLayout><Cards /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * App root — provides all contexts and the router.
 * Context order: Auth (outermost) → Cards → Statements (innermost)
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CardsProvider>
          <StatementsProvider>
            <div className="app-container">
              <AppRoutes />
            </div>
          </StatementsProvider>
        </CardsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
