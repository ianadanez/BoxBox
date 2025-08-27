import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { db } from './services/db';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PredictionsPage from './pages/PredictionsPage';
import TournamentsPage from './pages/TournamentsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';

const PrivateRoute: React.FC<{ children: React.ReactNode, adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="text-center p-8">Verificando autenticación...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (adminOnly && user.role !== 'admin') {
         return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};


const App: React.FC = () => {
  // Expose db functions globally for debugging
  React.useEffect(() => {
    (window as any).db = db;
  }, []);

  return (
    <AuthProvider>
        <HashRouter>
            <div className="min-h-screen bg-[var(--background-dark)] text-[var(--text-primary)]">
                <Header />
                <main>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />

                        <Route path="/predict/:gpId" element={
                            <PrivateRoute><PredictionsPage /></PrivateRoute>
                        } />
                        <Route path="/tournaments" element={
                            <PrivateRoute><TournamentsPage /></PrivateRoute>
                        } />

                        <Route path="/admin" element={
                            <PrivateRoute adminOnly={true}><AdminPage /></PrivateRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;