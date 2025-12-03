
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeasonTotal, Avatar as AvatarType, GrandPrix, Driver, OfficialResult, User, Prediction } from '../types';
import { db } from '../services/db';
import { engine } from '../services/engine';
import { useAuth } from '../contexts/AuthContext';
// TODO: El componente StandingsTable fue eliminado. Debe ser recreado para la OffSeasonPage.
// import StandingsTable from '../components/common/StandingsTable';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Confetti from 'react-confetti';

interface OffSeasonPageProps {
    seasonYear: number;
}

// --- Componentes de la Tarjeta del Podio (Top 3 Users) ---
const UserPodiumCard: React.FC<{
    position: number;
    user: (SeasonTotal & { userAvatar?: AvatarType, userUsername?: string });
    animationDelay: string;
}> = ({ position, user, animationDelay }) => {
    const positionStyles: { [key: number]: string } = {
        1: 'border-yellow-400 sm:h-48 shadow-yellow-400/30',
        2: 'border-gray-400 sm:h-44 sm:self-end shadow-gray-400/20',
        3: 'border-orange-400 sm:h-40 sm:self-end shadow-orange-400/20'
    };
    return (
        <div
            className={`relative bg-[var(--background-light)] shadow-lg p-4 rounded-lg border-l-4 flex flex-col justify-center text-center opacity-0 animate-float-up ${positionStyles[position]}`}
            style={{ animationDelay }}
        >
            <div className="absolute top-2 right-3 text-2xl font-bold text-white/50">#{position}</div>
            <div className="flex flex-col items-center justify-center">
                <Avatar avatar={user.userAvatar} className="w-16 h-16 sm:w-20 sm:h-20 mb-3" />
                <p className="text-xl font-bold text-[var(--text-primary)]">
                    {position === 1 && '👑 '}
                    {user.userUsername}
                </p>
                <p className="text-md font-semibold text-[var(--text-secondary)] mt-1 tracking-wider">{user.totalPoints} PUNTOS</p>
            </div>
        </div>
    );
};

// --- Componentes para el Resumen de la Temporada (Integrado) ---
const ResultCard: React.FC<{ title: string; driverId?: string; drivers: Driver[] }> = ({ title, driverId, drivers }) => {
  const driverName = drivers.find(d => d.id === driverId)?.name || 'N/A';
  return (
    <div className="bg-[#1e1e1e] p-4 rounded-lg text-center">
      <h4 className="text-sm text-gray-400 uppercase font-semibold mb-2">{title}</h4>
      <p className="text-lg font-bold text-white">{driverName}</p>
    </div>
  );
};

const PodiumDisplay: React.FC<{ podium: string[]; drivers: Driver[] }> = ({ podium, drivers }) => {
    if (!podium || podium.length < 3) return <p className="text-center text-gray-400">Datos del podio no disponibles.</p>;
    const podiumSteps = [
        { position: 2, driverId: podium[1], color: 'bg-gray-400', height: 'h-32' },
        { position: 1, driverId: podium[0], color: 'bg-yellow-400', height: 'h-40' },
        { position: 3, driverId: podium[2], color: 'bg-orange-400', height: 'h-24' },
    ];

    return (
        <div className="flex items-end justify-center gap-1 h-48 max-w-lg mx-auto">
            {podiumSteps.map(({ position, driverId, color, height }) => {
                const driver = drivers.find(d => d.id === driverId);
                return (
                    <div key={position} className={`w-1/3 flex flex-col items-center justify-end rounded-t-lg p-2 text-center ${color} ${height}`}>
                        <p className="text-3xl font-black text-black/40">{position}</p>
                        <p className="font-bold text-black text-sm sm:text-base">{driver ? driver.name : 'N/A'}</p>
                    </div>
                );
            })}
        </div>
    );
};

const PredictionDetailModal: React.FC<{ standing: any, drivers: Driver[], onClose: () => void }> = ({ standing, drivers, onClose }) => {
  if (!standing || !standing.prediction) return null;
  const getDriverName = (driverId: string) => drivers.find(d => d.id === driverId)?.name || 'N/A';
  const p = standing.prediction;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-lg w-full border-t-4 border-yellow-400" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-yellow-400 mb-4">Predicción de {standing.userUsername}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
          <p><strong>Pole:</strong> {getDriverName(p.pole)}</p>
          <p><strong>Vuelta Rápida:</strong> {getDriverName(p.fastestLap)}</p>
          <p><strong>Piloto del Día:</strong> {getDriverName(p.driverOfTheDay)}</p>
          <p className="sm:col-span-2"><strong>Top 3 Carrera:</strong> {p.racePodium.map(getDriverName).join(', ')}</p>
        </div>
        <button onClick={onClose} className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cerrar</button>
      </div>
    </div>
  );
};

// --- Página Principal de Fin de Temporada ---
const OffSeasonPage: React.FC<OffSeasonPageProps> = ({ seasonYear }) => {
    const { user } = useAuth();

    // --- Estados Combinados ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Datos generales
    const [seasonStandings, setSeasonStandings] = useState<(SeasonTotal & { userAvatar?: AvatarType, userUsername?: string })[]>([]);
    const [schedule, setSchedule] = useState<GrandPrix[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Vista por GP
    const [viewMode, setViewMode] = useState<'season' | 'gp'>('season');
    const [selectedGpId, setSelectedGpId] = useState<string>('');
    const [loadingRaceData, setLoadingRaceData] = useState(false);
    const [officialResult, setOfficialResult] = useState<OfficialResult | null>(null);
    const [gpStandings, setGpStandings] = useState<any[]>([]);
    const [viewingPredictionFor, setViewingPredictionFor] = useState<any | null>(null);

    // --- Carga de Datos Inicial ---
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [seasonTotals, usersData, scheduleData, driversData] = await Promise.all([
                    db.calculateSeasonTotals(seasonYear),
                    db.getUsers(),
                    db.getSchedule(seasonYear),
                    db.getDrivers(),
                ]);

                const hydratedLeaderboard = seasonTotals.map(standing => {
                    const user = usersData.find(u => u.id === standing.userId);
                    return {
                        ...standing,
                        userAvatar: user?.avatarUrl,
                        userUsername: user?.username || standing.username,
                    };
                });

                setSeasonStandings(hydratedLeaderboard);
                setAllUsers(usersData);
                setSchedule(scheduleData);
                setDrivers(driversData);

            } catch (error) {
                console.error("Fallo al cargar los datos de la página:", error);
                setError("No se pudo cargar la información de la temporada.");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [seasonYear]);

    // --- Lógica para manejar la selección de GP ---
    const handleRaceSelection = async (gpId: string) => {
        setSelectedGpId(gpId);
        if (!gpId) {
            setViewMode('season');
            return;
        }
        
        setViewMode('gp');
        setOfficialResult(null);
        setGpStandings([]);
        setError(null);

        try {
            setLoadingRaceData(true);
            const result = await db.getOfficialResult(parseInt(gpId));
            setOfficialResult(result || null);

            if (result) {
                const predictions = await db.getPredictionsForGp(parseInt(gpId));
                const standingsPromises = predictions.map(async (prediction) => {
                    const gp = schedule.find(g => g.id === parseInt(gpId));
                    if (!gp) return null;
                    const score = await engine.calculateGpScore(gp, prediction, result);
                    const player = allUsers.find(u => u.id === prediction.userId);
                    const p1Hit = (result.racePodium && prediction.racePodium && result.racePodium[0] === prediction.racePodium[0]) ? 1 : 0;
                    const poleHit = (result.pole && prediction.pole && result.pole === prediction.pole) ? 1 : 0;

                    return {
                        userId: player?.id || '',
                        userUsername: player?.username || 'N/A',
                        userAvatar: player?.avatarUrl,
                        points: score.totalPoints,
                        prediction: prediction,
                        details: { exactP1: p1Hit, exactPole: poleHit },
                    };
                });

                let allStandings = (await Promise.all(standingsPromises)).filter(s => s !== null) as any[];
                allStandings.sort((a, b) => b.points - a.points);
                setGpStandings(allStandings);
            }
        } catch (err) {
            console.error("Error loading race data:", err);
            setError('Error al cargar los datos de la carrera.');
        } finally {
            setLoadingRaceData(false);
        }
    };

    // --- Renderizado ---
    if (loading) return <LoadingSpinner />;

    const champions = seasonStandings.slice(0, 3);
    const wrappedLink = user ? '/wrapped' : '/login';
    const linkState = user ? {} : { state: { from: '/wrapped' } };

    return (
        <div className="relative overflow-x-hidden">
            {viewingPredictionFor && <PredictionDetailModal standing={viewingPredictionFor} drivers={drivers} onClose={() => setViewingPredictionFor(null)} />}
            {champions.length >= 1 && <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={250} recycle={true} gravity={0.08} />}
            
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl text-white">
                <div className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold f1-yellow-text">Fin de Temporada {seasonYear}</h1>
                    <p className="text-lg sm:text-xl text-[var(--text-secondary)] mt-4">¡La temporada {seasonYear} ha concluido! Felicidades a los ganadores y prepárense para la próxima.</p>
                </div>

                {champions.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-6 f1-red-text text-center">🏆 Podio de Campeones {seasonYear} 🏆</h2>
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-end max-w-3xl mx-auto">
                            {champions[1] && <div className="w-full sm:w-1/3 order-2 sm:order-1"><UserPodiumCard position={2} user={champions[1]} animationDelay="0.2s" /></div>}
                            {champions[0] && <div className="w-full sm:w-1/3 order-1 sm:order-2"><UserPodiumCard position={1} user={champions[0]} animationDelay="0s" /></div>}
                            {champions[2] && <div className="w-full sm:w-1/3 order-3 sm:order-3"><UserPodiumCard position={3} user={champions[2]} animationDelay="0.4s" /></div>}
                        </div>
                    </div>
                )}

                <div className="text-center my-12">
                    <Link to={wrappedLink} {...linkState} className="inline-block bg-[var(--accent-blue)] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-600 transition-all text-lg shadow-lg hover:shadow-blue-500/50 transform hover:scale-105">
                        Ver Mi Resumen de la Temporada
                    </Link>
                </div>

                {/* --- Sección de Resumen de Temporada Integrada --- */}
                <div className="mt-12">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 f1-red-text text-center">Análisis de la Temporada {seasonYear}</h2>
                    <div className="my-6 sm:my-8 p-4 sm:p-6 bg-[var(--background-medium)] rounded-xl border border-[var(--border-color)] max-w-4xl mx-auto">
                        <p className="text-center text-base sm:text-lg text-[var(--text-secondary)] mb-4">Selecciona una carrera para ver su análisis o explora la clasificación general.</p>
                        <select value={selectedGpId} onChange={(e) => handleRaceSelection(e.target.value)} className="w-full p-3 text-base sm:text-lg bg-[var(--background-light)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]">
                            <option value="">-- Ver Clasificación General de Jugadores --</option>
                            {schedule.map(gp => <option key={gp.id} value={gp.id}>{gp.name}</option>)}
                        </select>
                    </div>

                    {error && <div className="p-4 my-4 text-center text-red-400 bg-red-900/30 rounded-lg">{error}</div>}

                    {viewMode === 'season' && (
                        // TODO: Reactivar cuando el componente StandingsTable esté listo.
                        // <StandingsTable title={`Clasificación General ${seasonYear}`} standings={seasonStandings} />
                        <p className="text-center text-gray-400">La tabla de clasificación general se mostrará aquí.</p>
                    )}

                    {viewMode === 'gp' && (
                        <>
                            {loadingRaceData && <LoadingSpinner />}
                            {!loadingRaceData && officialResult && (
                                <div className="space-y-8">
                                    <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 text-center">Resultados Oficiales - {schedule.find(g => g.id.toString() === selectedGpId)?.name}</h3>
                                    <PodiumDisplay podium={officialResult.racePodium || []} drivers={drivers} />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                                        <ResultCard title="Pole Position" driverId={officialResult.pole} drivers={drivers} />
                                        <ResultCard title="Vuelta Rápida" driverId={officialResult.fastestLap} drivers={drivers} />
                                        <ResultCard title="Piloto del Día" driverId={officialResult.dotd} drivers={drivers} />
                                    </div>
                                    {/* TODO: Reactivar cuando el componente StandingsTable esté listo.
                                    <StandingsTable 
                                        title={`Clasificación de Jugadores - ${schedule.find(g => g.id.toString() === selectedGpId)?.name}`}
                                        standings={gpStandings}
                                        actionButtonLabel="Ver Predicción"
                                        onActionClick={(item) => setViewingPredictionFor(item)}
                                    />
                                    */}
                                     <p className="text-center text-gray-400">La tabla de clasificación del GP se mostrará aquí.</p>
                                </div>
                            )}
                            {!loadingRaceData && !officialResult && selectedGpId && <p className="text-center mt-8 text-gray-400">No hay resultados disponibles para esta carrera todavía.</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OffSeasonPage;
