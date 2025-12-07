
import React, { Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/animations.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/common/CookieConsent';
import LoadingSpinner from './components/common/LoadingSpinner';
import { listenToActiveSeason } from './services/seasonService'; // Import the service
import FavoriteTeamBanner from './components/common/FavoriteTeamBanner';

// Lazy Load Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const PredictionsPage = React.lazy(() => import('./pages/PredictionsPage'));
const TournamentsPage = React.lazy(() => import('./pages/TournamentsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ResultsReviewPage = React.lazy(() => import('./pages/ResultsReviewPage'));
const HowToPlayPage = React.lazy(() => import('./pages/HowToPlayPage'));
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage'));
const OffSeasonPage = React.lazy(() => import('./pages/OffSeasonPage'));
const SeasonWrappedPage = React.lazy(() => import('./pages/SeasonWrappedPage'));

const PrivateRoute: React.FC<{ children: React.ReactNode, adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();
    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const [isOffSeason, setIsOffSeason] = useState<boolean | null>(null);

    useEffect(() => {
        // Live listener to react immediately to season status changes (no cache dependency)
        const unsub = listenToActiveSeason((seasonId) => {
            setIsOffSeason(seasonId === null);
        });
        return () => {
            if (unsub) unsub();
        };
    }, []);

    if (isOffSeason === null) {
        return <LoadingSpinner />;
    }

    // If no active season, show OffSeasonPage and bypass the rest of the routes.
    return (
        <Routes>
            <Route path="/" element={isOffSeason ? <OffSeasonPage /> : <HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/how-to-play" element={<HowToPlayPage />} />
            <Route path="/predict/:gpId" element={<PrivateRoute><PredictionsPage /></PrivateRoute>} />
            <Route path="/tournaments" element={<PrivateRoute><TournamentsPage /></PrivateRoute>} />
            <Route path="/results/:userId/:gpId" element={<PrivateRoute><ResultsReviewPage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminPage /></PrivateRoute>} />
            <Route path="/wrapped" element={<PrivateRoute><SeasonWrappedPage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <div className="min-h-screen bg-[var(--background-dark)] text-[var(--text-primary)] flex flex-col">
                <Header />
                <FavoriteTeamBanner />
                <main className="flex-grow flex flex-col">
                    <Suspense fallback={<LoadingSpinner />}>
                        <AppRoutes /> 
                    </Suspense>
                </main>
                <Footer />
                <CookieConsent />
            </div>
        </HashRouter>
    </AuthProvider>
  );
};

export default App;
