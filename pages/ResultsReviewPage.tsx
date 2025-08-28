
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { User, GrandPrix, Prediction, OfficialResult, Driver, Team, GpScore } from '../types';
import Avatar from '../components/common/Avatar';
import { SCORING_RULES } from '../constants';
import * as htmlToImage from 'html-to-image';

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

interface ShareableCardProps {
    user: User | null;
    gp: GrandPrix | null;
    score: GpScore | null;
    prediction: Prediction | null;
    result: OfficialResult | null;
    drivers: Driver[];
    teams: Team[];
}

const ShareableResultCard = React.forwardRef<HTMLDivElement, ShareableCardProps>(({
    user, gp, score, prediction, result, drivers, teams
}, ref) => {
    if (!user || !gp || !result) return null;

    const getDriverName = (driverId?: string | null) => drivers.find(d => d.id === driverId)?.name || 'N/A';

    const PredictionRow: React.FC<{ label: string, pId?: string | null, rId?: string | null }> = ({ label, pId, rId }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{label}</span>
            <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getDriverName(pId)}</span>
                <span style={{ marginLeft: '12px', color: pId === rId ? '#52E252' : '#F91536' }}>{pId ? (pId === rId ? '✅' : '❌') : '·'}</span>
            </div>
        </div>
    );

    return (
        <div ref={ref} style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '450px',
            height: '800px',
            backgroundColor: 'var(--background-dark)',
            color: 'var(--text-primary)',
            fontFamily: "'Poppins', sans-serif",
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(225, 6, 0, 0.1), transparent 30%), radial-gradient(circle at 90% 80%, rgba(0, 210, 255, 0.1), transparent 30%)'
        }}>
            <header style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h1 style={{ color: 'var(--accent-red)', fontSize: '32px', fontWeight: 700, margin: 0 }}>BoxBox</h1>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>F1 Prediction Game</p>
            </header>

            <section style={{ padding: '24px 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{gp.name}</h2>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>{gp.track}</p>
            </section>
            
            <section style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--background-medium)', padding: '16px', borderRadius: '8px' }}>
                <Avatar avatar={user.avatar} className="w-16 h-16" />
                <div style={{ flexGrow: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '20px', margin: 0 }}>{user.name}</p>
                    <p style={{ color: 'var(--text-secondary)', margin: '0', fontSize: '14px' }}>Puntuación del GP</p>
                    <p style={{ color: 'var(--accent-blue)', fontSize: '36px', fontWeight: 700, margin: '4px 0 0' }}>{score?.totalPoints ?? 0}</p>
                </div>
            </section>

            <section style={{ flexGrow: 1, paddingTop: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Resumen de Predicciones</h3>
                <div style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', padding: '16px', borderRadius: '8px' }}>
                    <PredictionRow label="Pole Position" pId={prediction?.pole} rId={result.pole} />
                    <PredictionRow label="Podio P1" pId={prediction?.racePodium?.[0]} rId={result.racePodium?.[0]} />
                    <PredictionRow label="Podio P2" pId={prediction?.racePodium?.[1]} rId={result.racePodium?.[1]} />
                    <PredictionRow label="Podio P3" pId={prediction?.racePodium?.[2]} rId={result.racePodium?.[2]} />
                    <PredictionRow label="Vuelta Rápida" pId={prediction?.fastestLap} rId={result.fastestLap} />
                </div>
            </section>

            <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginTop: 'auto', paddingTop: '16px' }}>
                Generado con BoxBox
            </footer>
        </div>
    );
});


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
    const [isSharing, setIsSharing] = useState(false);

    const shareableCardRef = useRef<HTMLDivElement>(null);

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

    const handleShare = () => {
        if (shareableCardRef.current === null || isSharing) {
            return;
        }
        setIsSharing(true);
        htmlToImage.toPng(shareableCardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#0A0A0A' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                const safeGpName = lastGp?.name.toLowerCase().replace(/\s+/g, '-') || 'gp';
                link.download = `boxbox-resultados-${safeGpName}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
                alert('No se pudo generar la imagen. Por favor, inténtalo de nuevo.');
            })
            .finally(() => {
                setIsSharing(false);
            });
    };

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
        <>
            <ShareableResultCard
                ref={shareableCardRef}
                user={profileUser}
                gp={lastGp}
                score={gpScore}
                prediction={userPrediction}
                result={officialResult}
                drivers={drivers}
                teams={teams}
            />
            <div className="container mx-auto p-4 md:p-8 max-w-5xl">
                <div className="flex items-center space-x-4 mb-2">
                    {profileUser && <Avatar avatar={profileUser.avatar} className="w-12 h-12" />}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Análisis de Resultados: {profileUser?.name}</h1>
                        <h2 className="text-lg text-gray-400">Fin de semana del {lastGp.name}</h2>
                    </div>
                </div>

                <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] my-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <p className="text-lg text-gray-300">Puntos Totales de la Carrera</p>
                        <p className="text-6xl font-bold text-[var(--accent-blue)] my-2">{gpScore?.totalPoints || 0}</p>
                        {!userPrediction && <p className="text-yellow-400 text-sm">No se encontró una predicción para este GP.</p>}
                    </div>
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-md transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{isSharing ? 'Generando...' : 'Compartir Resultado'}</span>
                    </button>
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
        </>
    );
};
export default ResultsReviewPage;