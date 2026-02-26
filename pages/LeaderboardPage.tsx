import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { engine } from '../services/engine';
import { getActiveSeason } from '../services/seasonService';
import { ConstructorStanding, GrandPrix, Driver, OfficialResult, SeasonTotal, User } from '../types';
import StandingsTable from '../components/common/StandingsTable';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';

type GpStanding = {
    userId: string;
    userUsername: string;
    userAvatar?: any;
    points: number;
    details?: {
        exactP1?: number;
        exactPole?: number;
        exactFastestLap?: number;
    };
};

const USERS_PER_PAGE = 15;
const normalizeTeamColor = (value?: string) => {
    if (!value) return '#9aa0a6';
    if (value.startsWith('bg-[') && value.endsWith(']')) {
        return value.slice(4, -1);
    }
    return value;
};

const LeaderboardPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [loadingGp, setLoadingGp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seasonId, setSeasonId] = useState<string | null>(null);

    const [schedule, setSchedule] = useState<GrandPrix[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const [seasonStandings, setSeasonStandings] = useState<SeasonTotal[]>([]);
    const [constructorsStandings, setConstructorsStandings] = useState<ConstructorStanding[]>([]);
    const [gpStandings, setGpStandings] = useState<GpStanding[]>([]);
    const [selectedGpId, setSelectedGpId] = useState<string>('');
    const [viewMode, setViewMode] = useState<'season' | 'gp'>('season');
    const [seasonPage, setSeasonPage] = useState(0);
    const [gpPage, setGpPage] = useState(0);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            setError(null);
            try {
                const [activeSeasonId, scheduleData, driversData] = await Promise.all([
                    getActiveSeason(),
                    db.getSchedule(),
                    db.getDrivers(true),
                ]);
                setSeasonId(activeSeasonId);
                setSchedule(scheduleData);
                setDrivers(driversData);

                let leaderboard: SeasonTotal[] = [];
                let constructors: ConstructorStanding[] = [];
                if (user) {
                    const [seasonTotals, usersList, constructorsTotals] = await Promise.all([
                        db.calculateSeasonTotals(),
                        db.getUsers(),
                        activeSeasonId ? db.calculateConstructorsStandingsForSeason(activeSeasonId) : Promise.resolve([]),
                    ]);
                    setAllUsers(usersList);
                    constructors = constructorsTotals;
                    leaderboard = seasonTotals.map(standing => {
                        const foundUser = usersList.find(u => u.id === standing.userId);
                        return {
                            ...standing,
                            userAvatar: foundUser?.avatar || standing.userAvatar,
                            userUsername: foundUser?.username || standing.userUsername,
                        };
                    });
                } else {
                    const [publicBoard, publicConstructors] = await Promise.all([
                        db.getPublicLeaderboardForActiveSeason(),
                        db.getPublicConstructorsLeaderboardForActiveSeason(),
                    ]);
                    constructors = publicConstructors;
                    leaderboard = publicBoard.map(entry => ({
                        userId: entry.userId || '',
                        userUsername: entry.userUsername,
                        userAvatar: entry.userAvatar,
                        totalPoints: entry.totalPoints,
                        details: {
                            exactP1: entry.details?.exactP1 ?? 0,
                            exactPole: entry.details?.exactPole ?? 0,
                            exactFastestLap: entry.details?.exactFastestLap ?? 0,
                        },
                    }));
                }
                setSeasonStandings(leaderboard);
                setConstructorsStandings(constructors);
                setSeasonPage(0);
            } catch (err) {
                console.error('Error loading leaderboard page:', err);
                setError('No se pudo cargar el leaderboard.');
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [user]);

    const handleGpSelection = async (gpId: string) => {
        setSelectedGpId(gpId);
        if (!gpId) {
            setViewMode('season');
            return;
        }
        setViewMode('gp');
        setLoadingGp(true);
        setError(null);
        setGpStandings([]);

        try {
            const parsedGpId = parseInt(gpId, 10);
            const gp = schedule.find(g => g.id === parsedGpId);
            const result: OfficialResult | undefined = await db.getOfficialResult(parsedGpId);

            if (!result || !gp) {
                setGpStandings([]);
                return;
            }

            if (user) {
                const predictions = await db.getPredictionsForGp(parsedGpId);
                const standings = predictions.map(prediction => {
                    const score = engine.calculateGpScore(gp, prediction, result);
                    const player = allUsers.find(u => u.id === prediction.userId);
                    const p1Hit = (result.racePodium && prediction.racePodium && result.racePodium[0] === prediction.racePodium[0]) ? 1 : 0;
                    const poleHit = (result.pole && prediction.pole && result.pole === prediction.pole) ? 1 : 0;
                    const fastestHit = (result.fastestLap && prediction.fastestLap && result.fastestLap === prediction.fastestLap) ? 1 : 0;
                    return {
                        userId: player?.id || prediction.userId,
                        userUsername: player?.username || 'N/A',
                        userAvatar: player?.avatar,
                        points: score.totalPoints,
                        details: { exactP1: p1Hit, exactPole: poleHit, exactFastestLap: fastestHit },
                    };
                }).filter(s => s.userId);

                standings.sort((a, b) => b.points - a.points);
                setGpStandings(standings);
                setGpPage(0);
            } else if (seasonId) {
                const publicGp = await db.getPublicGpStandings(seasonId, parsedGpId);
                const mapped = publicGp.map(entry => ({
                    userId: entry.userId || '',
                    userUsername: entry.userUsername,
                    userAvatar: entry.userAvatar,
                    points: entry.totalPoints,
                    details: entry.details || {},
                }));
                setGpStandings(mapped);
                setGpPage(0);
            }
        } catch (err) {
            console.error('Error loading GP standings:', err);
            setError('No se pudo cargar el GP seleccionado.');
        } finally {
            setLoadingGp(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl sm:text-4xl font-bold f1-red-text">Leaderboard</h1>
                    <p className="text-[var(--text-secondary)]">Consulta la tabla general o el rendimiento por GP.</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-sm font-semibold text-[var(--text-secondary)]" htmlFor="gp-select">
                        Ver por GP
                    </label>
                    <select
                        id="gp-select"
                        value={selectedGpId}
                        onChange={(e) => handleGpSelection(e.target.value)}
                        className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2 text-[var(--text-primary)] w-full sm:max-w-md"
                    >
                        <option value="">General</option>
                        {schedule.map(gp => (
                            <option key={gp.id} value={gp.id}>{gp.name}</option>
                        ))}
                    </select>
                </div>

                {error && <div className="text-sm text-red-400">{error}</div>}

                {viewMode === 'season' && (
                    <>
                        <StandingsTable
                            title="Clasificación general de la temporada"
                            standings={seasonStandings}
                            page={seasonPage}
                            perPage={USERS_PER_PAGE}
                            onPageChange={setSeasonPage}
                            emptyMessage="No hay datos disponibles."
                            highlightUserId={user?.id}
                            renderUserCell={(item) =>
                                item.userId ? (
                                    <Link to={`/profile/${item.userId}`} className="flex items-center space-x-3 group">
                                        <Avatar avatar={item.userAvatar} className="w-10 h-10" />
                                        <span className="group-hover:text-[var(--accent-red)] transition-colors">
                                            {item.userUsername}
                                            {user?.id === item.userId && (
                                                <span className="ml-2 text-xs font-semibold text-[var(--accent-red)]">· Tú</span>
                                            )}
                                        </span>
                                    </Link>
                                ) : (
                                    <div className="flex items-center space-x-3">
                                        <Avatar avatar={item.userAvatar} className="w-10 h-10" />
                                        <span>{item.userUsername}</span>
                                    </div>
                                )
                            }
                        />

                        <div className="bg-[var(--background-medium)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--border-color)]">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Campeonato de Constructores</h2>
                                <p className="text-xs text-[var(--text-secondary)]">1 punto cada 10 puntos de predicción por usuario.</p>
                            </div>
                            {constructorsStandings.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-[var(--text-secondary)]">No hay datos de constructores disponibles.</div>
                            ) : (
                                <div className="divide-y divide-[var(--border-color)]">
                                    {constructorsStandings.map((entry, index) => (
                                        <div key={entry.teamId} className="px-4 py-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-6 text-center text-sm font-semibold text-[var(--text-secondary)]">{index + 1}</span>
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: normalizeTeamColor(entry.teamColor) }}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.teamName}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">
                                                        Supporters: {entry.supporters} · Puntos de usuarios: {entry.sourceUserPoints}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-[var(--accent-blue)]">{entry.totalPoints}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {viewMode === 'gp' && (
                    <StandingsTable
                        title={selectedGpId ? `Clasificación por GP` : undefined}
                        standings={gpStandings}
                        page={gpPage}
                        perPage={USERS_PER_PAGE}
                        onPageChange={setGpPage}
                        emptyMessage={loadingGp ? 'Cargando datos del GP...' : 'No hay tabla para este GP.'}
                        highlightUserId={user?.id}
                        renderUserCell={(item) =>
                            item.userId ? (
                                <Link to={`/profile/${item.userId}`} className="flex items-center space-x-3 group">
                                    <Avatar avatar={item.userAvatar} className="w-10 h-10" />
                                    <span className="group-hover:text-[var(--accent-red)] transition-colors">
                                        {item.userUsername}
                                        {user?.id === item.userId && (
                                            <span className="ml-2 text-xs font-semibold text-[var(--accent-red)]">· Tú</span>
                                        )}
                                    </span>
                                </Link>
                            ) : (
                                <div className="flex items-center space-x-3">
                                    <Avatar avatar={item.userAvatar} className="w-10 h-10" />
                                    <span>{item.userUsername}</span>
                                </div>
                            )
                        }
                    />
                )}
            </div>
        </div>
    );
};

export default LeaderboardPage;
