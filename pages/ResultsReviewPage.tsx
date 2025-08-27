
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { User, GrandPrix, Prediction, OfficialResult, Driver, Team, GpScore } from '../types';
import Avatar from '../components/common/Avatar';
import { SCORING_RULES } from '../constants';

const getTeamColor = (driverId: string | undefined | null, drivers: Driver[], teams: Team[]) => {
  if (!driverId) return 'bg-gray-700';
  const driver = drivers.find(d => d.id === driverId);
  const team = teams.find(t => t.id === driver?.teamId);
  return team?.color || 'bg-gray-500';
};

const DriverDisplay: React.FC<{
    driverId: string | undefined | null, 
    drivers: Driver[], 
    teams: Team[],
    isCorrect?: boolean,
}> = ({ driverId, drivers, teams, isCorrect }) => {
    const driver = driverId ? drivers.find(d => d.id === driverId) : null;
    const team = driver ? teams.find(t => t.id === driver.teamId) : null;

    if (!driver) {
        return <div className="text-gray-500 italic">-- Sin predicción --</div>
    }

    return (
        <div className="flex items-center space-x-3">
            <div className={`w-1.5 h-8 rounded-full ${getTeamColor(driverId, drivers, teams)}`}></div>
            <div>
                <p className="font-semibold text-white">{driver.name}</p>
                <p className="text-xs text-gray-400">{team?.name || 'Equipo desconocido'}</p>
            </div>
            {isCorrect !== undefined && (
                 <span className="text-xl ml-auto">{isCorrect ? '✅' : '❌'}</span>
            )}
        </div>
    );
}

const ComparisonCard: React.FC<{
    title: string;
    prediction?: string | null;
    result?: string | null;
    points: number;
    drivers: Driver[];
    teams: Team[];
}> = ({ title, prediction, result, points, drivers, teams }) => {
    const isCorrect = !!(prediction && result && prediction === result);
    return (
        <div className="bg-[var(--background-light)] p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-200">{title}</h3>
                {points > 0 && <span className="text-lg font-bold text-[var(--accent-blue)]">+{points} pts</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-400 mb-1">Tu Predicción</p>
                    <DriverDisplay driverId={prediction} drivers={drivers} teams={teams} isCorrect={isCorrect} />
                </div>
                <div>
                    <p className="text-sm text-gray-400 mb-1">Resultado Oficial</p>
                    <DriverDisplay driverId={result} drivers={drivers} teams={teams} />
                </div>
            </div>
        </div>
    );
};

const PodiumComparisonCard: React.FC<{
    title: string;
    prediction?: (string | null)[];
    result?: (string | null)[];
    points: number;
    drivers: Driver[];
    teams: Team[];
}> = ({ title, prediction = [], result = [], points, drivers, teams }) => {
    const inPodiumPoints = SCORING_RULES.racePodium.inPodium;
    const sprintInPodiumPoints = SCORING_RULES.sprintPodium.inPodium;
    const isSprint = title.toLowerCase().includes('sprint');
    
    return (
         <div className="bg-[var(--background-light)] p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-200">{title}</h3>
                {points > 0 && <span className="text-lg font-bold text-[var(--accent-blue)]">+{points} pts</span>}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-400 mb-2">Tu Predicción</p>
                    <div className="space-y-2">
                        {([0, 1, 2]).map(i => {
                            const pDriverId = prediction[i];
                            const rDriverId = result[i];
                            const isExact = pDriverId && pDriverId === rDriverId;
                            const isInPodium = pDriverId && result.includes(pDriverId) && !isExact;
                            return (
                                <div key={i} className="flex items-center">
                                    <span className="font-bold text-gray-400 w-8">P{i+1}</span>
                                    <div className="flex-grow">
                                        <DriverDisplay driverId={pDriverId} drivers={drivers} teams={teams} />
                                    </div>
                                    <div className="w-16 text-right">
                                        {isExact && <span className="text-lg">✅</span>}
                                        {isInPodium && <span className="text-xs font-bold text-yellow-400">+{isSprint ? sprintInPodiumPoints : inPodiumPoints}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                 <div>
                    <p className="text-sm text-gray-400 mb-2">Resultado Oficial</p>
                    <div className="space-y-2">
                        {([0, 1, 2]).map(i => (
                           <div key={i} className="flex items-center">
                               <span className="font-bold text-gray-400 w-8">P{i+1}</span>
                               <div className="flex-grow">
                                   <DriverDisplay driverId={result[i]} drivers={drivers} teams={teams} />
                               </div>
                               <div className="w-16"></div>
                           </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const ResultsReviewPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [lastGp, setLastGp] = useState<GrandPrix | null>(null);
    const [userPrediction, setUserPrediction] = useState<Prediction | null>(null);
    const [officialResult, setOfficialResult] = useState<OfficialResult | null>(null);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [gpScore, setGpScore] = useState<GpScore | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) {
                navigate('/');
                return;
            }
            setLoading(true);
            try {
                const [
                    userToView,
                    allDrivers,
                    allTeams,
                    allGps,
                    allOfficialResults,
                ] = await Promise.all([
                    db.getUserById(userId),
                    db.getDrivers(),
                    db.getTeams(),
                    db.getSchedule(),
                    db.getOfficialResults(),
                ]);

                if (!userToView) {
                    navigate('/'); 
                    return;
                }
                
                setProfileUser(userToView);
                setDrivers(allDrivers);
                setTeams(allTeams);

                const lastResult = [...allOfficialResults].sort((a,b) => b.gpId - a.gpId)[0];

                if (lastResult) {
                    const gp = allGps.find(g => g.id === lastResult.gpId) || null;
                    const prediction = await db.getPrediction(userId, lastResult.gpId);
                    const score = prediction ? await db.calculateGpScore(prediction, lastResult) : null;
                    
                    setOfficialResult(lastResult);
                    setLastGp(gp);
                    setUserPrediction(prediction || null);
                    setGpScore(score);
                }
            } catch (error) {
                console.error("Error loading results review page:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, navigate]);

    if (loading) {
        return <div className="text-center p-8">Cargando resultados...</div>;
    }

    if (!lastGp || !officialResult) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl text-center">
                <h1 className="text-3xl font-bold mb-4">Sin Resultados</h1>
                <p className="text-[var(--text-secondary)]">Aún no se han publicado resultados oficiales esta temporada.</p>
                <Link to="/" className="mt-6 inline-block bg-[var(--accent-red)] text-white font-bold py-2 px-4 rounded">Volver al inicio</Link>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            <div className="flex items-center space-x-4 mb-2">
                {profileUser && <Avatar avatar={profileUser.avatar} className="w-12 h-12" />}
                <div>
                     <h1 className="text-2xl md:text-3xl font-bold text-white">Análisis de Resultados: {profileUser?.name}</h1>
                     <h2 className="text-lg text-gray-400">Fin de semana del {lastGp.name}</h2>
                </div>
            </div>

            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] my-6">
                <div className="text-center">
                    <p className="text-lg text-gray-300">Puntos Totales de la Carrera</p>
                    <p className="text-6xl font-bold text-[var(--accent-blue)] my-2">{gpScore?.totalPoints || 0}</p>
                    {!userPrediction && <p className="text-yellow-400 text-sm">No se encontró una predicción para este GP.</p>}
                </div>
            </div>

            <div className="space-y-6">
                 <ComparisonCard 
                    title="Pole Position"
                    prediction={userPrediction?.pole}
                    result={officialResult.pole}
                    points={gpScore?.breakdown.pole || 0}
                    drivers={drivers} teams={teams}
                />

                {lastGp.hasSprint && (
                    <>
                         <ComparisonCard 
                            title="Sprint Pole"
                            prediction={userPrediction?.sprintPole}
                            result={officialResult.sprintPole}
                            points={gpScore?.breakdown.sprintPole || 0}
                            drivers={drivers} teams={teams}
                        />
                        <PodiumComparisonCard 
                            title="Podio del Sprint"
                            prediction={userPrediction?.sprintPodium}
                            result={officialResult.sprintPodium}
                            points={gpScore?.breakdown.sprintPodium || 0}
                            drivers={drivers} teams={teams}
                        />
                    </>
                )}
                
                 <PodiumComparisonCard 
                    title="Podio de la Carrera"
                    prediction={userPrediction?.racePodium}
                    result={officialResult.racePodium}
                    points={gpScore?.breakdown.racePodium || 0}
                    drivers={drivers} teams={teams}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ComparisonCard 
                        title="Vuelta Rápida"
                        prediction={userPrediction?.fastestLap}
                        result={officialResult.fastestLap}
                        points={gpScore?.breakdown.fastestLap || 0}
                        drivers={drivers} teams={teams}
                    />
                    <ComparisonCard 
                        title="Piloto del Día"
                        prediction={userPrediction?.driverOfTheDay}
                        result={officialResult.driverOfTheDay}
                        points={gpScore?.breakdown.driverOfTheDay || 0}
                        drivers={drivers} teams={teams}
                    />
                </div>
            </div>
        </div>
    );
};
export default ResultsReviewPage;
