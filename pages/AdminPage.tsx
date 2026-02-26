import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import SeasonManagement from '../components/SeasonManagement';
import { UsersManagement } from '../components/UsersManagement';
import { CalendarManagement } from '../components/CalendarManagement';
import { DriversManagement } from '../components/DriversManagement';
import { ResultsManagement } from '../components/ResultsManagement';
import { db } from '../services/db';
import { toast } from 'react-toastify';
import NotificationsManagement from '../components/NotificationsManagement';

type AdminTab = 'results' | 'users' | 'calendar' | 'drivers' | 'seasons' | 'notifications';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<AdminTab>('results');
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') {
        return <div className="text-center p-8">Acceso denegado.</div>;
    }

    const handlePublishPublicLeaderboard = async () => {
        try {
            setPublishing(true);
            const count = await db.publishPublicLeaderboard();
            toast.success(`Leaderboard público actualizado con ${count} usuarios.`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'No se pudo publicar el leaderboard público.');
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

            <div className="mb-4 p-4 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <p className="text-lg font-semibold">Leaderboard público</p>
                        <p className="text-sm text-[var(--text-secondary)]">Publica una copia pública (username, avatar, puntos) para visitantes sin login.</p>
                    </div>
                    <button
                        onClick={handlePublishPublicLeaderboard}
                        disabled={publishing}
                        className="px-4 py-2 rounded-md bg-[var(--accent-red)] text-white font-bold hover:opacity-90 disabled:opacity-60"
                    >
                        {publishing ? 'Publicando...' : 'Publicar leaderboard público'}
                    </button>
                </div>
            </div>

            <div className="flex border-b border-[var(--border-color)] mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'results' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Resultados</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Usuarios</button>
                <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'calendar' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Calendario</button>
                <button onClick={() => setActiveTab('drivers')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'drivers' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Pilotos y Equipos</button>
                <button onClick={() => setActiveTab('seasons')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'seasons' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Temporadas</button>
                <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'notifications' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Notificaciones</button>
            </div>
            <div>
                {activeTab === 'results' && <ResultsManagement />}
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'calendar' && <CalendarManagement />}
                {activeTab === 'drivers' && <DriversManagement />}
                {activeTab === 'seasons' && <SeasonManagement />}
                {activeTab === 'notifications' && <NotificationsManagement />}
            </div>
        </div>
    );
};

export default AdminPage;
