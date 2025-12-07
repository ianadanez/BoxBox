import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { getActiveSeason, listenToActiveSeason } from '../../services/seasonService';
import { Team } from '../../types';

/**
 * Banner liviano que pide confirmar la escudería favorita para la temporada activa.
 * Se muestra solo a usuarios logueados cuando la temporada cambió o falta confirmación.
 */
const FavoriteTeamBanner: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    // Escucha cambios de temporada activa
    useEffect(() => {
        const bootstrap = async () => {
            const initial = await getActiveSeason();
            setActiveSeasonId(initial);
        };
        bootstrap();
        const unsub = listenToActiveSeason((id) => setActiveSeasonId(id));
        return () => { if (unsub) unsub(); };
    }, []);

    // Carga equipos y decide si mostrar
    useEffect(() => {
        const maybeShow = async () => {
            if (!user || !activeSeasonId) {
                setShow(false);
                return;
            }
            if (user.favoriteTeamSeason === activeSeasonId) {
                setShow(false);
                return;
            }
            const seasonTeams = await db.getTeams();
            setTeams(seasonTeams);
            const validExisting = user.favoriteTeamId && seasonTeams.some(t => t.id === user.favoriteTeamId);
            setSelectedTeamId(validExisting ? user.favoriteTeamId : (seasonTeams[0]?.id || ''));
            setShow(true);
        };
        maybeShow();
    }, [user, activeSeasonId]);

    const handleConfirm = async () => {
        if (!user || !activeSeasonId || !selectedTeamId) return;
        setLoading(true);
        const updatedUser = {
            ...user,
            favoriteTeamId: selectedTeamId,
            favoriteTeamSeason: activeSeasonId,
        };
        await updateUser(updatedUser);
        setLoading(false);
        setShow(false);
    };

    if (!show || !user) return null;

    return (
        <div className="bg-[var(--background-medium)] border-b border-[var(--border-color)]">
            <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">Temporada {activeSeasonId || 'actual'}</p>
                    <h3 className="text-base sm:text-lg font-bold">Confirmá tu escudería favorita</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Se renueva cada año.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full sm:w-56 px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]"
                    >
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || !selectedTeamId}
                        className="px-4 py-2 rounded-md bg-[var(--accent-red)] text-white font-bold hover:opacity-90 disabled:opacity-60 transition-colors"
                    >
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FavoriteTeamBanner;
