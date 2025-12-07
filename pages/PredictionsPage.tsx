import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GrandPrix, Driver, Prediction, Team } from '../types';
import { db } from '../services/db';
import { engine } from '../services/engine';
import DriverAutocomplete from '../components/common/DriverAutocomplete';

const PredictionsPage: React.FC = () => {
  const { gpId } = useParams<{ gpId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gp, setGp] = useState<GrandPrix | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prediction, setPrediction] = useState<Partial<Prediction>>({});
  const [isSprintLocked, setIsSprintLocked] = useState(false);
  const [isRaceLocked, setIsRaceLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setLoading(true);
        const numericGpId = Number(gpId);
        try {
            const [schedule, activeDrivers, allTeams] = await Promise.all([
                db.getSchedule(),
                db.getDrivers(true),
                db.getTeams()
            ]);

            const foundGp = schedule.find(g => g.id === numericGpId);
            
            if (foundGp) {
                setGp(foundGp);
                const userPrediction = await db.getPrediction(user.id, numericGpId);
                setPrediction(userPrediction || { userId: user.id, gpId: numericGpId });
            } else {
                navigate('/'); // GP not found
            }
            
            setDrivers(activeDrivers);
            setTeams(allTeams);

        } catch (error) {
            console.error("Failed to load prediction data:", error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };
    if (user) loadData();
  }, [gpId, user, navigate]);

  useEffect(() => {
    if (!gp) return;
    
    const checkLocks = () => {
        const { isRaceLocked: race, isSprintLocked: sprint } = engine.getLockStatus(gp);
        setIsRaceLocked(race);
        setIsSprintLocked(sprint);
    };

    checkLocks();
    const interval = setInterval(checkLocks, 1000 * 30); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [gp]);

  const handleSave = async () => {
    if (!user || !gp || Object.keys(prediction).length <= 2) return;

    setSaveStatus('saving');
    
    const completePrediction: Prediction = {
        userId: user.id,
        gpId: gp.id,
        submittedAt: prediction.submittedAt || new Date().toISOString(),
        ...prediction
    };
    
    await db.savePrediction(completePrediction as Prediction);

    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleChange = (name: keyof Omit<Prediction, 'sprintPodium' | 'racePodium' | 'userId' | 'gpId' | 'submittedAt'>, value: string | null) => {
    setPrediction(prev => ({...prev, [name]: value}));
  };
  
  const handlePodiumChange = (section: 'racePodium' | 'sprintPodium', pos: number, value: string | null) => {
    setPrediction(prev => {
        const newPodium = [...(prev[section] || [null, null, null])];
        newPodium[pos] = value;
        return {...prev, [section]: newPodium as [string, string, string]};
    });
  };

  if (loading || !gp) {
    return <div className="text-center p-8">Cargando Gran Premio...</div>;
  }
  
  const getPodiumUsedDrivers = (podium: 'racePodium' | 'sprintPodium') => prediction[podium] || [];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(225,6,0,0.14), transparent 25%), radial-gradient(circle at 80% 70%, rgba(0,210,255,0.12), transparent 30%)' }} />
      <div className="container mx-auto p-4 md:p-8 max-w-6xl relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
              <p className="text-sm text-[var(--text-secondary)]">Gran Premio</p>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">{gp.name}</h1>
              <p className="text-lg text-[var(--text-secondary)]">{gp.track}</p>
          </div>
          <div className="bg-[var(--background-medium)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg shadow-black/30 w-full lg:w-96">
              <p className="text-sm text-gray-300 mb-2">Estado</p>
              <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isRaceLocked ? 'bg-red-900/60 text-red-200 border border-red-700/60' : 'bg-green-900/40 text-green-200 border border-green-700/50'}`}>
                      Carrera {isRaceLocked ? 'bloqueada' : 'abierta'}
                  </span>
                  {gp.hasSprint && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isSprintLocked ? 'bg-blue-900/50 text-blue-200 border border-blue-700/60' : 'bg-green-900/40 text-green-200 border border-green-700/50'}`}>
                        Sprint {isSprintLocked ? 'bloqueado' : 'abierto'}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--background-light)] border border-[var(--border-color)] text-gray-200">
                      Guarda antes de la quali
                  </span>
              </div>
          </div>
        </div>
        
        {isRaceLocked ? (
            <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-200 text-center p-4 rounded-lg mb-6">
                <p className="font-bold">Las predicciones para este Gran Premio están cerradas.</p>
                <p className="text-sm">El formulario se bloquea 5 minutos antes del inicio de la clasificación.</p>
            </div>
        ) : isSprintLocked && gp.hasSprint && (
             <div className="bg-blue-900/50 border border-blue-600 text-blue-200 text-center p-4 rounded-lg mb-6">
                <p className="font-bold">Las predicciones para el Sprint están cerradas.</p>
                <p className="text-sm">Todavía puedes modificar tus predicciones para la Clasificación y la Carrera principal.</p>
            </div>
        )}

        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          
          {/* Sprint */}
          {gp.hasSprint && (
              <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isSprintLocked ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <p className="text-xs text-[var(--text-secondary)]">Sesión Sprint</p>
                        <h2 className="text-2xl font-semibold f1-red-text">Sprint</h2>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">Cierra antes del Sprint Shootout</span>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                          <label htmlFor="sprintPole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint Pole</label>
                          <DriverAutocomplete id="sprintPole" value={prediction.sprintPole} onChange={(id) => handleChange('sprintPole', id)} drivers={drivers} teams={teams} disabled={isSprintLocked} />
                      </div>
                      <div>
                          <label htmlFor="sprintP1" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P1</label>
                           <DriverAutocomplete id="sprintP1" value={prediction.sprintPodium?.[0]} onChange={(id) => handlePodiumChange('sprintPodium', 0, id)} drivers={drivers} teams={teams} disabled={isSprintLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                      </div>
                       <div>
                          <label htmlFor="sprintP2" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P2</label>
                           <DriverAutocomplete id="sprintP2" value={prediction.sprintPodium?.[1]} onChange={(id) => handlePodiumChange('sprintPodium', 1, id)} drivers={drivers} teams={teams} disabled={isSprintLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                      </div>
                       <div>
                          <label htmlFor="sprintP3" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P3</label>
                           <DriverAutocomplete id="sprintP3" value={prediction.sprintPodium?.[2]} onChange={(id) => handlePodiumChange('sprintPodium', 2, id)} drivers={drivers} teams={teams} disabled={isSprintLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                      </div>
                   </div>
              </section>
          )}

          {/* Classification */}
          <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isRaceLocked ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Clasificación</p>
                    <h2 className="text-2xl font-semibold f1-red-text">Qualy</h2>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Cierra 5 minutos antes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="pole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pole Position</label>
                <DriverAutocomplete id="pole" value={prediction.pole} onChange={(id) => handleChange('pole', id)} drivers={drivers} teams={teams} disabled={isRaceLocked} />
              </div>
            </div>
          </section>

          {/* Race */}
          <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isRaceLocked ? 'opacity-60' : ''}`}>
             <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p className="text-xs text-[var(--text-secondary)]">Carrera</p>
                    <h2 className="text-2xl font-semibold f1-red-text">Domingo</h2>
                </div>
             </div>
             <div className="space-y-6">
                  <div>
                       <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Podio</label>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div>
                              <label htmlFor="raceP1" className="block text-xs font-medium text-gray-400 mb-1">P1 (Primer Puesto)</label>
                              <DriverAutocomplete id="raceP1" value={prediction.racePodium?.[0]} onChange={(id) => handlePodiumChange('racePodium', 0, id)} drivers={drivers} teams={teams} disabled={isRaceLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                           </div>
                           <div>
                              <label htmlFor="raceP2" className="block text-xs font-medium text-gray-400 mb-1">P2 (Segundo Puesto)</label>
                              <DriverAutocomplete id="raceP2" value={prediction.racePodium?.[1]} onChange={(id) => handlePodiumChange('racePodium', 1, id)} drivers={drivers} teams={teams} disabled={isRaceLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                           </div>
                           <div>
                              <label htmlFor="raceP3" className="block text-xs font-medium text-gray-400 mb-1">P3 (Tercer Puesto)</label>
                              <DriverAutocomplete id="raceP3" value={prediction.racePodium?.[2]} onChange={(id) => handlePodiumChange('racePodium', 2, id)} drivers={drivers} teams={teams} disabled={isRaceLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                           </div>
                       </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div>
                          <label htmlFor="fastestLap" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Vuelta Rápida</label>
                          <DriverAutocomplete id="fastestLap" value={prediction.fastestLap} onChange={(id) => handleChange('fastestLap', id)} drivers={drivers} teams={teams} disabled={isRaceLocked} />
                      </div>
                      <div>
                          <label htmlFor="driverOfTheDay" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Piloto del Día</label>
                          <DriverAutocomplete id="driverOfTheDay" value={prediction.driverOfTheDay} onChange={(id) => handleChange('driverOfTheDay', id)} drivers={drivers} teams={teams} disabled={isRaceLocked} />
                      </div>
                   </div>
             </div>
          </section>

          <div className="sticky bottom-4 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-xl shadow-2xl shadow-black/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                  <p className="text-sm text-gray-300">Guardá tus picks</p>
                  <p className="text-xs text-[var(--text-secondary)]">Se actualizan al instante.</p>
              </div>
              <button 
                  onClick={handleSave} 
                  disabled={isRaceLocked || saveStatus === 'saving'}
                  className="w-full sm:w-auto bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-md text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Predicciones guardadas' : 'Guardar predicciones'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PredictionsPage;
