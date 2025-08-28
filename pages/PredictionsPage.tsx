
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GrandPrix, Driver, Prediction, Team } from '../types';
import { db } from '../services/db';
import { LOCK_MINUTES_BEFORE } from '../constants';
import DriverAutocomplete from '../components/common/DriverAutocomplete';

const PredictionsPage: React.FC = () => {
  const { gpId } = useParams<{ gpId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gp, setGp] = useState<GrandPrix | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prediction, setPrediction] = useState<Partial<Prediction>>({});
  const [isLocked, setIsLocked] = useState(false);
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
    
    // The entire form locks based on the qualifying time.
    const getLockTime = (eventTime: string) => new Date(new Date(eventTime).getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);

    const checkLock = () => {
        const now = new Date();
        setIsLocked(now > getLockTime(gp.events.quali));
    };

    checkLock();
    const interval = setInterval(checkLock, 1000 * 30); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [gp]);

  const handleSave = useCallback(async () => {
    if (!user || !gp) return;
     // Check if any prediction has been made
    const hasMadePrediction = Object.values(prediction).some(val => {
        if (Array.isArray(val)) return val.some(v => v);
        return !!val;
    });

    if (!hasMadePrediction) return;


    setSaveStatus('saving');
    
    const completePrediction: Prediction = {
        userId: user.id,
        gpId: gp.id,
        submittedAt: prediction.submittedAt || new Date().toISOString(),
        ...prediction
    };
    
    await db.savePrediction(completePrediction as Prediction);

    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2000);

  }, [prediction, user, gp]);

  useEffect(() => {
    // Debounced auto-save
    if (saveStatus === 'idle' && Object.keys(prediction).length > 2) { // more than just userId and gpId
      const handler = setTimeout(() => {
        handleSave();
      }, 1500); 
      return () => clearTimeout(handler);
    }
  }, [prediction, handleSave, saveStatus]);


  const handleChange = (name: keyof Omit<Prediction, 'sprintPodium' | 'racePodium' | 'userId' | 'gpId' | 'submittedAt'>, value: string | null) => {
    setPrediction(prev => ({...prev, [name]: value}));
    setSaveStatus('idle');
  };
  
  const handlePodiumChange = (section: 'racePodium' | 'sprintPodium', pos: number, value: string | null) => {
    setPrediction(prev => {
        const newPodium = [...(prev[section] || [null, null, null])];
        newPodium[pos] = value;
        return {...prev, [section]: newPodium as [string, string, string]};
    });
    setSaveStatus('idle');
  };

  if (loading || !gp) {
    return <div className="text-center p-8">Cargando Gran Premio...</div>;
  }
  
  const getPodiumUsedDrivers = (podium: 'racePodium' | 'sprintPodium') => prediction[podium] || [];

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">{gp.name}</h1>
            <p className="text-lg text-[var(--text-secondary)]">{gp.track}</p>
        </div>
        <div className="text-right text-sm">
            {saveStatus === 'saving' && <span className="text-yellow-400">Guardando...</span>}
            {saveStatus === 'saved' && <span className="text-green-400">Guardado ✓</span>}
        </div>
      </div>
      
       {isLocked && (
            <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-300 text-center p-4 rounded-lg mb-6">
                <p className="font-bold">Las predicciones para este Gran Premio están cerradas.</p>
                <p className="text-sm">El formulario se ha bloqueado 5 minutos antes del inicio de la clasificación.</p>
            </div>
        )}

      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        {/* Classification */}
        <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isLocked ? 'opacity-60' : ''}`}>
          <h2 className="text-2xl font-semibold f1-red-text mb-4">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pole Position</label>
              <DriverAutocomplete id="pole" value={prediction.pole} onChange={(id) => handleChange('pole', id)} drivers={drivers} teams={teams} disabled={isLocked} />
            </div>
          </div>
        </section>

        {/* Sprint */}
        {gp.hasSprint && (
            <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isLocked ? 'opacity-60' : ''}`}>
                <h2 className="text-2xl font-semibold f1-red-text mb-4">Sprint</h2>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label htmlFor="sprintPole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint Pole</label>
                        <DriverAutocomplete id="sprintPole" value={prediction.sprintPole} onChange={(id) => handleChange('sprintPole', id)} drivers={drivers} teams={teams} disabled={isLocked} />
                    </div>
                    <div>
                        <label htmlFor="sprintP1" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P1</label>
                         <DriverAutocomplete id="sprintP1" value={prediction.sprintPodium?.[0]} onChange={(id) => handlePodiumChange('sprintPodium', 0, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                     <div>
                        <label htmlFor="sprintP2" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P2</label>
                         <DriverAutocomplete id="sprintP2" value={prediction.sprintPodium?.[1]} onChange={(id) => handlePodiumChange('sprintPodium', 1, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                     <div>
                        <label htmlFor="sprintP3" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P3</label>
                         <DriverAutocomplete id="sprintP3" value={prediction.sprintPodium?.[2]} onChange={(id) => handlePodiumChange('sprintPodium', 2, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                 </div>
            </section>
        )}

        {/* Race */}
        <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${isLocked ? 'opacity-60' : ''}`}>
           <h2 className="text-2xl font-semibold f1-red-text mb-4">Carrera</h2>
           <div className="space-y-6">
                <div>
                     <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Podio</label>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div>
                            <label htmlFor="raceP1" className="block text-xs font-medium text-gray-400 mb-1">P1 (Primer Puesto)</label>
                            <DriverAutocomplete id="raceP1" value={prediction.racePodium?.[0]} onChange={(id) => handlePodiumChange('racePodium', 0, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                         <div>
                            <label htmlFor="raceP2" className="block text-xs font-medium text-gray-400 mb-1">P2 (Segundo Puesto)</label>
                            <DriverAutocomplete id="raceP2" value={prediction.racePodium?.[1]} onChange={(id) => handlePodiumChange('racePodium', 1, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                         <div>
                            <label htmlFor="raceP3" className="block text-xs font-medium text-gray-400 mb-1">P3 (Tercer Puesto)</label>
                            <DriverAutocomplete id="raceP3" value={prediction.racePodium?.[2]} onChange={(id) => handlePodiumChange('racePodium', 2, id)} drivers={drivers} teams={teams} disabled={isLocked} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                     </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                        <label htmlFor="fastestLap" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Vuelta Rápida</label>
                        <DriverAutocomplete id="fastestLap" value={prediction.fastestLap} onChange={(id) => handleChange('fastestLap', id)} drivers={drivers} teams={teams} disabled={isLocked} />
                    </div>
                    <div>
                        <label htmlFor="driverOfTheDay" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Piloto del Día</label>
                        <DriverAutocomplete id="driverOfTheDay" value={prediction.driverOfTheDay} onChange={(id) => handleChange('driverOfTheDay', id)} drivers={drivers} teams={teams} disabled={isLocked} />
                    </div>
                 </div>
           </div>
        </section>
      </form>
    </div>
  );
};

export default PredictionsPage;
