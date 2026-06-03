import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CardsProvider } from './context/CardsContext';
import { StatementsProvider } from './context/StatementsContext';
import Dashboard from './screens/Dashboard/Dashboard';
import Spending from './screens/Spending/Spending';
import Installments from './screens/Installments/Installments';
import Analytics from './screens/Analytics/Analytics';
import Cards from './screens/Cards/Cards';
import Login from './screens/Login/Login';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CardsProvider>
          <StatementsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/spending" element={<Spending />} />
              <Route path="/installments" element={<Installments />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </StatementsProvider>
        </CardsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
