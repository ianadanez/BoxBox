
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

import SeasonManagement from '../components/SeasonManagement';
import { UsersManagement } from '../components/UsersManagement';
import { CalendarManagement } from '../components/CalendarManagement';
import { DriversManagement } from '../components/DriversManagement';
import { ResultsManagement } from '../components/ResultsManagement';

type AdminTab = 'seasons' | 'results' | 'users' | 'calendar' | 'drivers';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<AdminTab>('seasons');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') {
        return <div className="text-center p-8">Acceso denegado.</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
            <div className="flex border-b border-[var(--border-color)] mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('seasons')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'seasons' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Temporadas</button>
                <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'results' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Resultados</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Usuarios</button>
                <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'calendar' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Calendario</button>
                <button onClick={() => setActiveTab('drivers')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'drivers' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Pilotos y Equipos</button>
            </div>
            <div>
                {activeTab === 'seasons' && <SeasonManagement />}
                {activeTab === 'results' && <ResultsManagement />}
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'calendar' && <CalendarManagement />}
                {activeTab === 'drivers' && <DriversManagement />}
            </div>
        </div>
    );
};

export default AdminPage;
