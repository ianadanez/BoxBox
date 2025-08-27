

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GrandPrix, OfficialResult, Driver, Team, SeasonTotal, GpScore, Tournament } from '../types';
import { db } from '../services/db';
import Countdown from '../components/common/Countdown';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../contexts/AuthContext';

// --- Guest View Components ---

const getTeamColor = (driverId: string, drivers: Driver[], teams: Team[]) => {
  const driver = drivers.find(d => d.id === driverId);
  const team = teams.find(t => t.id === driver?.teamId);
  return team?.color || 'bg-gray-500';
};

const ResultCard: React.FC<{ title: string; driverId?: string, drivers: Driver[], teams: Team[] }> = ({ title, driverId, drivers, teams }) => {
    if (!drivers.length || !teams.length) return null;
    const driver = drivers.find(d => d.id === driverId);
    if (!driverId || !driver) return (
        <div className="bg-[var(--background-light)] p-4 rounded-lg flex items-center space-x-3 animate-pulse">
            <div className="w-1.5 h-10 rounded-full bg-[var(--border-color)]"></div>
            <div>
                <p className="text-sm text-[var(--text-secondary)]">{title}</p>
                <div className="h-5 w-24 bg-[var(--background-light)] rounded mt-1"></div>
            </div>
        </div>
    );

    return (
        <div className="bg-[var(--background-light)] p-4 rounded-lg flex items-center space-x-3">
            <div className={`w-1.5 h-10 rounded-full ${getTeamColor(driver.id, drivers, teams)}`}></div>
            <div>
                <p className="text-sm text-[var(--text-secondary)]">{title}</p>
                <p className="font-bold text-[var(--text-primary)]">{driver.name}</p>
            </div>
        </div>
    );
};

const PodiumCard: React.FC<{ position: number; driverId?: string; drivers: Driver[], teams: Team[] }> = ({ position, driverId, drivers, teams }) => {
    const positionStyles: { [key: number]: string } = { 1: 'border-[var(--accent-red)]', 2: 'border-gray-400', 3: 'border-yellow-600' };
    if (!drivers.length || !teams.length) return (
        <div className={`bg-[var(--background-light)] p-4 rounded-lg border-l-4 ${positionStyles[position]} animate-pulse`}>
            <div className="h-6 w-8 bg-[var(--border-color)] rounded mb-2"></div>
            <div className="h-4 w-28 bg-[var(--border-color)] rounded mb-1"></div>
            <div className="h-3 w-20 bg-[var(--border-color)] rounded"></div>
        </div>
    );
    
    const driver = drivers.find(d => d.id === driverId);
    if (!driverId || !driver) return null;

    return (
        <div className={`bg-[var(--background-light)] p-4 rounded-lg border-l-4 ${positionStyles[position]}`}>
            <p className="text-lg font-bold text-[var(--text-primary)]">P{position}</p>
            <p className="text-md font-medium text-[var(--text-primary)]">{driver.name}</p>
            <p className="text-xs text-[var(--text-secondary)]">{teams.find(t => t.id === driver.teamId)?.name}</p>
        </div>
    );
};


// --- Dashboard Components ---

const PointsChart: React.FC<{ scores: GpScore[], schedule: GrandPrix[] }> = ({ scores, schedule }) => {
    const maxPoints = Math.max(...scores.map(s => s.totalPoints), 50);
    const chartHeight = 150;
    
    return (
        <div className="w-full h-full flex items-end space-x-2 p-2 pt-6 bg-[var(--background-light)]/50 rounded-lg">
            {scores.map(score => {
                const gp = schedule.find(g => g.id === score.gpId);
                const barHeight = (score.totalPoints / maxPoints) * chartHeight;
                return (
                    <div key={score.gpId} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute -top-6 bg-[var(--background-medium)] px-2 py-1 rounded text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {gp?.name}: {score.totalPoints} pts
                        </div>
                        <div 
                            className="w-full bg-[var(--accent-blue)] hover:bg-opacity-80 rounded-t-sm transition-all"
                            style={{ height: `${barHeight}px` }}
                        ></div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono uppercase">{gp?.name.substring(0,3)}</div>
                    </div>
                )
            })}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        seasonTotals: SeasonTotal[],
        myTournaments: Tournament[],
        myScores: GpScore[],
        schedule: GrandPrix[],
    } | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [
                    seasonTotals,
                    allTournaments,
                    myScores,
                    schedule
                ] = await Promise.all([
                    db.calculateSeasonTotals(),
                    db.getTournaments(),
                    db.getScoresForUser(user.id),
                    db.getSchedule(),
                ]);
                
                const myTournaments = allTournaments.filter(t => t.memberIds.includes(user.id));

                setStats({ seasonTotals, myTournaments, myScores, schedule });
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    if (loading || !stats || !user) {
        return <div className="text-center p-8">Cargando tu dashboard...</div>
    }

    const myRank = stats.seasonTotals.findIndex(s => s.userId === user.id) + 1;
    
    const getTournamentRank = (tournament: Tournament) => {
        const tournamentRanking = stats.seasonTotals
            .filter(s => tournament.memberIds.includes(s.userId))
            .sort((a,b) => b.totalPoints - a.totalPoints);
        return tournamentRanking.findIndex(s => s.userId === user.id) + 1;
    };

    return (
        <div className="space-y-8">
             <h1 className="text-3xl md:text-4xl font-bold">Bienvenido, {user.name}</h1>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)] flex flex-col justify-center items-center text-center">
                    <p className="text-[var(--text-secondary)] text-lg">Posición General</p>
                    <p className="text-7xl font-bold f1-red-text my-2">{myRank > 0 ? myRank : '-'}</p>
                    <p className="text-[var(--text-secondary)]">de {stats.seasonTotals.length} participantes</p>
                </div>
                <div className="md:col-span-2 bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                    <h2 className="text-2xl font-bold mb-4">Mis Torneos</h2>
                    <div className="space-y-3">
                        {stats.myTournaments.length > 0 ? stats.myTournaments.map(t => (
                            <Link to="/tournaments" key={t.id} className="block bg-[var(--background-light)] p-3 rounded-lg hover:bg-[var(--border-color)] transition-colors">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold">{t.name}</p>
                                    <p>Tu Posición: <span className="font-bold text-[var(--accent-blue)]">{getTournamentRank(t)}</span>/{t.memberIds.length}</p>
                                </div>
                            </Link>
                        )) : <p className="text-[var(--text-secondary)]">No estás en ningún torneo. <Link to="/tournaments" className="text-[var(--accent-blue)] hover:underline">¡Únete o crea uno!</Link></p>}
                    </div>
                </div>
             </div>
              <div className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold mb-4">Evolución de Puntos</h2>
                {stats.myScores.length > 0 ? (
                    <PointsChart scores={stats.myScores} schedule={stats.schedule} />
                ) : <p className="text-center text-[var(--text-secondary)] py-8">Aún no hay puntos registrados esta temporada.</p>}
             </div>
        </div>
    );
};

// --- Main Page Component ---

const HomePage: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [guestData, setGuestData] = useState<{
        lastGp: GrandPrix | null;
        nextGp: GrandPrix | null;
        lastResult: OfficialResult | null;
        leaderboard: SeasonTotal[];
        drivers: Driver[];
        teams: Team[];
    }>({ lastGp: null, nextGp: null, lastResult: null, leaderboard: [], drivers: [], teams: [] });
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (user || authLoading) return; // Don't fetch guest data if user is logged in or we are still checking
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const [schedule, officialResults, driversData, teamsData, seasonTotals] = await Promise.all([
                    db.getSchedule(),
                    db.getOfficialResults(),
                    db.getDrivers(),
                    db.getTeams(),
                    db.calculateSeasonTotals(),
                ]);
                
                const now = new Date();
                
                const finishedGpsWithResult = schedule.filter(gp => 
                    new Date(gp.events.race) < now && officialResults.some(r => r.gpId === gp.id)
                );
                const upcomingGps = schedule
                    .filter(gp => new Date(gp.events.race) >= now)
                    .sort((a, b) => new Date(a.events.race).getTime() - new Date(b.events.race).getTime());

                const lastFinishedGp = finishedGpsWithResult.pop();
                
                setGuestData({
                    drivers: driversData,
                    teams: teamsData,
                    leaderboard: seasonTotals,
                    lastGp: lastFinishedGp || null,
                    lastResult: lastFinishedGp ? (officialResults.find(r => r.gpId === lastFinishedGp.id) || null) : null,
                    nextGp: upcomingGps[0] || null
                });
            } catch (error) {
                console.error("Failed to fetch homepage data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, authLoading]);

    if (authLoading) {
        return <div className="text-center p-8">Cargando...</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            {user ? (
                <Dashboard />
            ) : (
                // Guest View
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        {loading && !guestData.lastGp && (
                             <div className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)] animate-pulse">
                                 <div className="h-8 w-3/4 bg-[var(--background-light)] rounded mb-6"></div>
                                 <div className="space-y-4">
                                    <div className="h-6 w-1/4 bg-[var(--background-light)] rounded mb-4"></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                       <div className="h-24 bg-[var(--background-light)] rounded-lg"></div>
                                       <div className="h-24 bg-[var(--background-light)] rounded-lg"></div>
                                       <div className="h-24 bg-[var(--background-light)] rounded-lg"></div>
                                    </div>
                                 </div>
                            </div>
                        )}
                        {guestData.lastGp && guestData.lastResult && (
                            <div className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                                <h2 className="text-2xl font-bold mb-4 f1-red-text">Resultados: {guestData.lastGp.name}</h2>
                                <div className="space-y-4">
                                   <h3 className="font-semibold text-lg text-[var(--text-primary)]">Carrera</h3>
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                       {guestData.lastResult.racePodium?.map((driverId, i) => <PodiumCard key={i} position={i+1} driverId={driverId} drivers={guestData.drivers} teams={guestData.teams}/>)}
                                   </div>
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                       <ResultCard title="Pole Position" driverId={guestData.lastResult.pole} drivers={guestData.drivers} teams={guestData.teams}/>
                                       <ResultCard title="Vuelta Rápida" driverId={guestData.lastResult.fastestLap} drivers={guestData.drivers} teams={guestData.teams}/>
                                       <ResultCard title="Piloto del Día" driverId={guestData.lastResult.driverOfTheDay} drivers={guestData.drivers} teams={guestData.teams}/>
                                   </div>
                                   {guestData.lastGp.hasSprint && guestData.lastResult.sprintPodium && (
                                       <>
                                        <h3 className="font-semibold text-lg text-[var(--text-primary)] pt-4">Sprint</h3>
                                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {guestData.lastResult.sprintPodium?.map((driverId, i) => <PodiumCard key={`sprint-${i}`} position={i+1} driverId={driverId} drivers={guestData.drivers} teams={guestData.teams}/>)}
                                        </div>
                                       </>
                                   )}
                                </div>
                            </div>
                        )}
                        {guestData.nextGp && (
                            <div className="bg-gradient-to-br from-[var(--accent-red)] to-red-800 p-6 rounded-xl text-white text-center shadow-2xl shadow-red-900/20">
                               <h2 className="text-xl font-bold uppercase tracking-widest">Próximo GP</h2>
                               <p className="text-3xl font-light mt-2 mb-4">{guestData.nextGp.name}</p>
                               <Countdown targetDate={guestData.nextGp.events.race} />
                               <Link to={`/predict/${guestData.nextGp.id}`} className="mt-6 inline-block bg-white text-[var(--accent-red)] font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-transform hover:scale-105 shadow-lg">
                                   Hacer Predicción
                               </Link>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                        <h2 className="text-2xl font-bold mb-4 f1-red-text">Tabla General de la Temporada</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-[var(--border-color)]">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-center">Pos</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide" colSpan={2}>Usuario</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-right">Puntos</th>
                                        <th className="hidden md:table-cell p-3 text-sm font-semibold tracking-wide text-center">P1</th>
                                        <th className="hidden md:table-cell p-3 text-sm font-semibold tracking-wide text-center">Pole</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guestData.leaderboard.map((score, index) => (
                                        <tr key={score.userId} className="border-b border-[var(--border-color)]">
                                            <td className="p-3 text-lg font-bold text-center text-[var(--text-secondary)]">{index + 1}</td>
                                            <td className="p-2">
                                                <Link to={`/profile/${score.userId}`}>
                                                    <Avatar avatar={score.userAvatar} className="w-10 h-10" />
                                                </Link>
                                            </td>
                                            <td className="p-2 font-medium">
                                                <Link to={`/profile/${score.userId}`} className="hover:text-[var(--accent-red)] transition-colors">{score.userName}</Link>
                                            </td>
                                            <td className="p-3 text-right font-mono text-lg font-bold text-[var(--accent-blue)]">{score.totalPoints}</td>
                                            <td className="hidden md:table-cell p-3 text-center font-mono text-[var(--text-secondary)]">{score.details.exactP1}</td>
                                            <td className="hidden md:table-cell p-3 text-center font-mono text-[var(--text-secondary)]">{score.details.exactPole}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;