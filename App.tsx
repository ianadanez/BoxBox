
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/common/CookieConsent';
import HomePage from './pages/HomePage';
import PredictionsPage from './pages/PredictionsPage';
import TournamentsPage from './pages/TournamentsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import ResultsReviewPage from './pages/ResultsReviewPage';
import HowToPlayPage from './pages/HowToPlayPage';
import EmailVerificationPage from './pages/EmailVerificationPage';

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
  return (
    <AuthProvider>
        <HashRouter>
            <div className="min-h-screen bg-[var(--background-dark)] text-[var(--text-primary)] flex flex-col">
                <Header />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/verify-email" element={<EmailVerificationPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />
                        <Route path="/how-to-play" element={<HowToPlayPage />} />
                        
                        <Route path="/predict/:gpId" element={
                            <PrivateRoute><PredictionsPage /></PrivateRoute>
                        } />
                        <Route path="/tournaments" element={
                            <PrivateRoute><TournamentsPage /></PrivateRoute>
                        } />
                         <Route path="/results/:userId/:gpId" element={
                            <PrivateRoute><ResultsReviewPage /></PrivateRoute>
                        } />

                        <Route path="/admin" element={
                            <PrivateRoute adminOnly={true}><AdminPage /></PrivateRoute>
                        } />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                <Footer />
                <CookieConsent />
            </div>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;
