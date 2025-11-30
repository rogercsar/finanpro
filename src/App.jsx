import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIAdvisorProvider } from './context/AIAdvisorContext';
import { AlertsProvider } from './context/AlertsContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import GoalsPage from './pages/GoalsPage';
import FinancialAdvisorPage from './pages/FinancialAdvisorPage';
import SimulatorPage from './pages/SimulatorPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import GoalDetailPage from './pages/GoalDetailPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import SubscriptionDetailPage from './pages/SubscriptionDetailPage';
import AIChatWidget from './components/AIChatWidgetNew';

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <AIAdvisorProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} /> 
            <Route path="income" element={<IncomePage />} />
            <Route path="expenses" element={<ExpensePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="goals/:id" element={<GoalDetailPage />} />
            <Route path="transactions/:id" element={<TransactionDetailPage />} />
            <Route path="subscriptions/:id" element={<SubscriptionDetailPage />} />
            <Route path="advisor" element={<FinancialAdvisorPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
          </Route>
        </Routes>
        {user && <AIChatWidget />}
      </AIAdvisorProvider>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AlertsProvider>
        <AppContent />
      </AlertsProvider>
    </AuthProvider>
  );
}

export default App;
