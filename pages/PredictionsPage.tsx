
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GrandPrix, Driver, Prediction, Team } from '../types';
import { db } from '../services/db';
import { LOCK_MINUTES_BEFORE } from '../constants';

const DriverSelect: React.FC<{
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  drivers: Driver[];
  teams: Team[];
  disabled?: boolean;
  usedDrivers?: string[];
}> = ({ id, value, onChange, drivers, teams, disabled = false, usedDrivers = [] }) => {
    return (
        <select
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            <option value="">-- Seleccionar Piloto --</option>
            {teams.map(team => (
                <optgroup key={team.id} label={team.name} className="bg-gray-800">
                    {drivers.filter(d => d.teamId === team.id).map(driver => (
                        <option 
                            key={driver.id} 
                            value={driver.id}
                            disabled={usedDrivers.includes(driver.id) && driver.id !== value}
                            className="bg-gray-700"
                        >
                            {driver.name}
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
};

const PredictionsPage: React.FC = () => {
  const { gpId } = useParams<{ gpId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gp, setGp] = useState<GrandPrix | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prediction, setPrediction] = useState<Partial<Prediction>>({});
  const [locks, setLocks] = useState({ quali: false, sprint: false, race: false });
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

    const getLockTime = (eventTime: string) =>
        new Date(new Date(eventTime).getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);

    const checkLocks = () => {
        const now = new Date();
        setLocks({
            quali: now > getLockTime(gp.events.quali),
            sprint: gp.hasSprint && gp.events.sprint ? now > getLockTime(gp.events.sprint) : true,
            race: now > getLockTime(gp.events.race)
        });
    };

    checkLocks();
    const interval = setInterval(checkLocks, 1000 * 30); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [gp]);

  const handleSave = useCallback(async () => {
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
    setTimeout(() => setSaveStatus('idle'), 2000);

  }, [prediction, user, gp]);

  useEffect(() => {
    if (saveStatus === 'idle') {
      const handler = setTimeout(() => {
        handleSave();
      }, 1500); // Debounce save
      return () => clearTimeout(handler);
    }
  }, [prediction, handleSave, saveStatus]);


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPrediction(prev => ({...prev, [name]: value}));
    setSaveStatus('idle');
  };
  
  const handlePodiumChange = (section: 'racePodium' | 'sprintPodium', pos: number, value: string) => {
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
      
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        {/* Classification */}
        <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${locks.quali ? 'opacity-60' : ''}`}>
          <h2 className="text-2xl font-semibold f1-red-text mb-4">Clasificación</h2>
          {locks.quali && <p className="text-yellow-400 text-sm mb-4">Esta sección está cerrada.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Pole Position</label>
              <DriverSelect id="pole" value={prediction.pole || ''} onChange={handleChange} drivers={drivers} teams={teams} disabled={locks.quali} />
            </div>
          </div>
        </section>

        {/* Sprint */}
        {gp.hasSprint && (
            <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${locks.sprint ? 'opacity-60' : ''}`}>
                <h2 className="text-2xl font-semibold f1-red-text mb-4">Sprint</h2>
                 {locks.sprint && <p className="text-yellow-400 text-sm mb-4">Esta sección está cerrada.</p>}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label htmlFor="sprintPole" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint Pole</label>
                        <DriverSelect id="sprintPole" value={prediction.sprintPole || ''} onChange={handleChange} drivers={drivers} teams={teams} disabled={locks.sprint} />
                    </div>
                    <div>
                        <label htmlFor="sprintP1" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P1</label>
                         <DriverSelect id="sprintP1" value={prediction.sprintPodium?.[0] || ''} onChange={(e) => handlePodiumChange('sprintPodium', 0, e.target.value)} drivers={drivers} teams={teams} disabled={locks.sprint} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                     <div>
                        <label htmlFor="sprintP2" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P2</label>
                         <DriverSelect id="sprintP2" value={prediction.sprintPodium?.[1] || ''} onChange={(e) => handlePodiumChange('sprintPodium', 1, e.target.value)} drivers={drivers} teams={teams} disabled={locks.sprint} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                     <div>
                        <label htmlFor="sprintP3" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Sprint P3</label>
                         <DriverSelect id="sprintP3" value={prediction.sprintPodium?.[2] || ''} onChange={(e) => handlePodiumChange('sprintPodium', 2, e.target.value)} drivers={drivers} teams={teams} disabled={locks.sprint} usedDrivers={getPodiumUsedDrivers('sprintPodium')} />
                    </div>
                 </div>
            </section>
        )}

        {/* Race */}
        <section className={`bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] transition-opacity ${locks.race ? 'opacity-60' : ''}`}>
           <h2 className="text-2xl font-semibold f1-red-text mb-4">Carrera</h2>
           {locks.race && <p className="text-yellow-400 text-sm mb-4">Esta sección está cerrada.</p>}
           <div className="space-y-6">
                <div>
                     <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Podio</label>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div>
                            <label htmlFor="raceP1" className="block text-xs font-medium text-gray-400 mb-1">P1 (Primer Puesto)</label>
                            <DriverSelect id="raceP1" value={prediction.racePodium?.[0] || ''} onChange={(e) => handlePodiumChange('racePodium', 0, e.target.value)} drivers={drivers} teams={teams} disabled={locks.race} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                         <div>
                            <label htmlFor="raceP2" className="block text-xs font-medium text-gray-400 mb-1">P2 (Segundo Puesto)</label>
                            <DriverSelect id="raceP2" value={prediction.racePodium?.[1] || ''} onChange={(e) => handlePodiumChange('racePodium', 1, e.target.value)} drivers={drivers} teams={teams} disabled={locks.race} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                         <div>
                            <label htmlFor="raceP3" className="block text-xs font-medium text-gray-400 mb-1">P3 (Tercer Puesto)</label>
                            <DriverSelect id="raceP3" value={prediction.racePodium?.[2] || ''} onChange={(e) => handlePodiumChange('racePodium', 2, e.target.value)} drivers={drivers} teams={teams} disabled={locks.race} usedDrivers={getPodiumUsedDrivers('racePodium')} />
                         </div>
                     </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                        <label htmlFor="fastestLap" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Vuelta Rápida</label>
                        <DriverSelect id="fastestLap" value={prediction.fastestLap || ''} onChange={handleChange} drivers={drivers} teams={teams} disabled={locks.race} />
                    </div>
                    <div>
                        <label htmlFor="driverOfTheDay" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Piloto del Día</label>
                        <DriverSelect id="driverOfTheDay" value={prediction.driverOfTheDay || ''} onChange={handleChange} drivers={drivers} teams={teams} disabled={locks.race} />
                    </div>
                 </div>
           </div>
        </section>
      </form>
    </div>
  );
};

export default PredictionsPage;