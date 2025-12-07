import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { db } from '../services/db';
import { engine } from '../services/engine';
import { SCORING_RULES } from '../constants';
import { User, GrandPrix, Prediction, OfficialResult, Driver, Team, GpScore } from '../types';
import { getActiveSeason } from '../services/seasonService';

const getTeamColor = (driverId: string | undefined | null, drivers: Driver[], teams: Team[]) => {
    if (!driverId) return 'bg-gray-700';
    const driver = drivers.find((d) => d.id === driverId);
    const team = teams.find((t) => t.id === driver?.teamId);
    return team?.color || 'bg-gray-500';
};

const DriverRow: React.FC<{
    label?: string;
    driverId?: string | null;
    drivers: Driver[];
    teams: Team[];
    isCorrect?: boolean;
    extraBadge?: React.ReactNode;
}> = ({ label, driverId, drivers, teams, isCorrect, extraBadge }) => {
    const driver = driverId ? drivers.find((d) => d.id === driverId) : null;
    const team = driver ? teams.find((t) => t.id === driver.teamId) : null;
    return (
        <div className="flex items-center gap-3 py-1">
            {label && <span className="w-8 text-xs font-semibold text-gray-400">{label}</span>}
            <div className={`w-1.5 h-8 rounded-full ${getTeamColor(driverId, drivers, teams)}`} />
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{driver?.name || 'Sin dato'}</p>
                <p className="text-xs text-gray-400 truncate">{team?.name || 'Equipo desconocido'}</p>
            </div>
            {extraBadge}
            {isCorrect !== undefined && (
                <span className="text-sm font-semibold text-gray-300">{isCorrect ? '✅' : '❌'}</span>
            )}
        </div>
    );
};

const PodiumCard: React.FC<{
    title: string;
    prediction?: (string | null)[];
    result?: (string | null)[];
    points: number;
    drivers: Driver[];
    teams: Team[];
    sprint?: boolean;
}> = ({ title, prediction = [], result = [], points, drivers, teams, sprint }) => {
    const inPodiumPoints = sprint ? SCORING_RULES.sprintPodium.inPodium : SCORING_RULES.racePodium.inPodium;
    return (
        <div className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                <span className="text-sm font-semibold text-[var(--accent-blue)]">+{points} pts</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-400 mb-2">Tu predicción</p>
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => {
                            const pId = prediction[i];
                            const rId = result[i];
                            const isExact = pId && rId && pId === rId;
                            const isInPodium = pId && result.includes(pId) && !isExact;
                            return (
                                <DriverRow
                                    key={i}
                                    label={`P${i + 1}`}
                                    driverId={pId}
                                    drivers={drivers}
                                    teams={teams}
                                    isCorrect={isExact}
                                    extraBadge={
                                        isInPodium ? (
                                            <span className="text-[10px] font-semibold text-yellow-400 px-2 py-1 rounded border border-yellow-500/40">
                                                +{inPodiumPoints}
                                            </span>
                                        ) : null
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-2">Resultado oficial</p>
                    <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                            <DriverRow key={i} label={`P${i + 1}`} driverId={result[i]} drivers={drivers} teams={teams} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OneToOneCard: React.FC<{
    title: string;
    prediction?: string | null;
    result?: string | null;
    points: number;
    drivers: Driver[];
    teams: Team[];
}> = ({ title, prediction, result, points, drivers, teams }) => {
    const isCorrect = !!(prediction && result && prediction === result);
    return (
        <div className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                <span className="text-sm font-semibold text-[var(--accent-blue)]">+{points} pts</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-400 mb-1">Tu predicción</p>
                    <DriverRow driverId={prediction} drivers={drivers} teams={teams} isCorrect={isCorrect} />
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-1">Resultado oficial</p>
                    <DriverRow driverId={result} drivers={drivers} teams={teams} />
                </div>
            </div>
        </div>
    );
};

const ResultsReviewPage: React.FC = () => {
    const { userId, gpId } = useParams<{ userId: string; gpId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [currentGp, setCurrentGp] = useState<GrandPrix | null>(null);
    const [userPrediction, setUserPrediction] = useState<Prediction | null>(null);
    const [officialResult, setOfficialResult] = useState<OfficialResult | null>(null);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [gpScore, setGpScore] = useState<GpScore | null>(null);
    const [seasonId, setSeasonId] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<GrandPrix[]>([]);

    // Load seasons and listen to active season
    // Load active season once (page is scoped to active season)
    useEffect(() => {
        const bootstrap = async () => {
            const params = new URLSearchParams(location.search);
            const querySeason = params.get('season');
            const hasSeasonParam = params.has('season');

            if (hasSeasonParam) {
                setSeasonId(querySeason || null);
                return;
            }

            const active = await getActiveSeason();
            setSeasonId(active);
        };
        bootstrap();
    }, [location.search]);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !gpId) {
                navigate('/');
                return;
            }
            if (!seasonId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const numericGpId = Number(gpId);
                const [userData, scheduleData, driversData, teamsData, resultData, predictions] = await Promise.all([
                    db.getUserById(userId),
                    db.getScheduleForSeason(seasonId),
                    db.getDriversForSeason(seasonId),
                    db.getTeamsForSeason(seasonId),
                    db.getOfficialResultForSeason(seasonId, numericGpId),
                    db.getPredictionsForGpInSeason(seasonId, numericGpId),
                ]);

                if (!userData) {
                    navigate('/');
                    return;
                }

                setProfileUser(userData);
                setSchedule(scheduleData);
                const gpData = scheduleData.find((g) => g.id === numericGpId) || null;
                setCurrentGp(gpData);
                setDrivers(driversData);
                setTeams(teamsData);
                setOfficialResult(resultData || null);

                const prediction = predictions.find((p) => p.userId === userId) || null;
                setUserPrediction(prediction);

                if (gpData && prediction && resultData) {
                    const score = await engine.calculateGpScore(gpData, prediction, resultData);
                    setGpScore(score);
                } else {
                    setGpScore(null);
                }
            } catch (error) {
                console.error('Error loading results review page:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, gpId, navigate, seasonId]);

    const seasonLabel = useMemo(() => seasonId || 'Temporada', [seasonId]);

    if (loading) {
        return <div className="text-center p-8">Cargando resultados...</div>;
    }

    if (!currentGp || !officialResult) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl text-center">
                <h1 className="text-3xl font-bold mb-4">Resultados no encontrados</h1>
                <p className="text-[var(--text-secondary)]">No se pudieron cargar los resultados para este Gran Premio.</p>
                <Link to="/" className="mt-6 inline-block bg-[var(--accent-red)] text-white font-bold py-2 px-4 rounded">
                    Volver al inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(225,6,0,0.15), transparent 25%), radial-gradient(circle at 80% 60%, rgba(0,210,255,0.12), transparent 30%)' }} />
            <div className="container mx-auto p-4 md:p-8 max-w-6xl relative space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {profileUser && <Avatar avatar={profileUser.avatar} className="w-12 h-12" />}
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Temporada {seasonLabel}</p>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Resultados de {profileUser?.username}</h1>
                            <p className="text-sm text-gray-400">{currentGp.name}</p>
                        </div>
                    </div>
                    {profileUser && (
                        <Link
                            to={`/profile/${profileUser.id}`}
                            className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--border-color)] text-sm text-white hover:bg-[var(--background-light)] transition-colors"
                        >
                            ← Volver al perfil
                        </Link>
                    )}
                </div>

                <div className="bg-[var(--background-medium)] border border-[var(--border-color)] rounded-xl p-6 shadow-lg shadow-black/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-sm text-gray-300">Puntos totales en este GP</p>
                            <p className="text-5xl font-black text-[var(--accent-blue)]">{gpScore?.totalPoints ?? 0}</p>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                            <p>Fecha: {currentGp.events?.race ? new Date(currentGp.events.race).toLocaleDateString() : '—'}</p>
                            <p>Circuito: {currentGp.track}</p>
                        </div>
                    </div>
                    {!userPrediction && (
                        <p className="text-yellow-400 text-sm mt-2">No se encontró una predicción para este GP en esta temporada.</p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OneToOneCard
                        title="Pole Position"
                        prediction={userPrediction?.pole}
                        result={officialResult.pole}
                        points={gpScore?.breakdown.pole || 0}
                        drivers={drivers}
                        teams={teams}
                    />
                    <OneToOneCard
                        title="Vuelta rápida"
                        prediction={userPrediction?.fastestLap}
                        result={officialResult.fastestLap}
                        points={gpScore?.breakdown.fastestLap || 0}
                        drivers={drivers}
                        teams={teams}
                    />
                    <OneToOneCard
                        title="Piloto del día"
                        prediction={userPrediction?.driverOfTheDay}
                        result={officialResult.driverOfTheDay}
                        points={gpScore?.breakdown.driverOfTheDay || 0}
                        drivers={drivers}
                        teams={teams}
                    />
                    {currentGp.hasSprint && (
                        <OneToOneCard
                            title="Sprint Pole"
                            prediction={userPrediction?.sprintPole}
                            result={officialResult.sprintPole}
                            points={gpScore?.breakdown.sprintPole || 0}
                            drivers={drivers}
                            teams={teams}
                        />
                    )}
                </div>

                {currentGp.hasSprint && (
                    <PodiumCard
                        title="Podio Sprint"
                        prediction={userPrediction?.sprintPodium}
                        result={officialResult.sprintPodium}
                        points={gpScore?.breakdown.sprintPodium || 0}
                        drivers={drivers}
                        teams={teams}
                        sprint
                    />
                )}

                <PodiumCard
                    title="Podio Carrera"
                    prediction={userPrediction?.racePodium}
                    result={officialResult.racePodium}
                    points={gpScore?.breakdown.racePodium || 0}
                    drivers={drivers}
                    teams={teams}
                />
            </div>
        </div>
    );
};

export default ResultsReviewPage;
