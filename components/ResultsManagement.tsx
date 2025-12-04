
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { GrandPrix, Driver, Result, OfficialResult } from '../types';

export const ResultsManagement: React.FC = () => {
    const { user } = useAuth();
    const [gps, setGps] = useState<GrandPrix[]>([]);
    const [selectedGp, setSelectedGp] = useState<GrandPrix | null>(null);
    const [draftResult, setDraftResult] = useState<Result | null>(null);
    const [officialResult, setOfficialResult] = useState<OfficialResult | null>(null);
    
    const [editableResult, setEditableResult] = useState<Partial<Result>>({});
    const [manualOverrides, setManualOverrides] = useState<OfficialResult['manualOverrides']>({});
    
    // State to hold the pristine, original result for the "Undo" functionality
    const [initialResult, setInitialResult] = useState<Partial<Result>>({});
    const [initialManualOverrides, setInitialManualOverrides] = useState<OfficialResult['manualOverrides']>({});

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingData(true);
            const [gpsData, driversData] = await Promise.all([db.getSchedule(), db.getDrivers(true)]);
            setGps(gpsData);
            setDrivers(driversData);
            setLoadingData(false);
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const loadGpData = async () => {
            if (selectedGp) {
                setLoading(true);
                const [draft, official] = await Promise.all([
                    db.getDraftResult(selectedGp.id),
                    db.getOfficialResult(selectedGp.id)
                ]);

                const resultToEdit = official || draft || { gpId: selectedGp.id };
                const overridesToEdit = official?.manualOverrides || {};

                // Deep copy to prevent any reference issues
                const initialResultCopy = JSON.parse(JSON.stringify(resultToEdit));
                const initialOverridesCopy = JSON.parse(JSON.stringify(overridesToEdit));

                setDraftResult(draft || null);
                setOfficialResult(official || null);
                
                setEditableResult(initialResultCopy);
                setManualOverrides(initialOverridesCopy);

                // Store the pristine initial state for the undo button
                setInitialResult(initialResultCopy);
                setInitialManualOverrides(initialOverridesCopy);
                
                setLoading(false);
            } else {
                setDraftResult(null);
                setOfficialResult(null);
                setEditableResult({});
                setInitialResult({});
                setManualOverrides({});
                setInitialManualOverrides({});
            }
        };
        loadGpData();
    }, [selectedGp]);
    
    const handlePublish = async () => {
        if(!selectedGp || !user) return;
        setLoading(true);
        
        // FIX: Correctly determine which sessions have results to build the `publishedSessions` array.
        const publishedSessions: ('quali' | 'sprint' | 'race')[] = [];
        if (editableResult.pole) {
            publishedSessions.push('quali');
        }
        if (selectedGp.hasSprint && (editableResult.sprintPole || editableResult.sprintPodium?.some(d => d))) {
            publishedSessions.push('sprint');
        }
        if (editableResult.racePodium?.some(d => d) || editableResult.fastestLap || editableResult.driverOfTheDay) {
            publishedSessions.push('race');
        }

        // FIX: Construct a valid `OfficialResult` object, ensuring `publishedSessions` is included.
        const resultToPublish: OfficialResult = {
            ...(editableResult as Result),
            gpId: selectedGp.id,
            publishedAt: new Date().toISOString(),
            manualOverrides: manualOverrides,
            publishedSessions: [...new Set([...(officialResult?.publishedSessions || []), ...publishedSessions])]
        };
        
        // FIX: Call the correct, newly implemented `publishResult` function from the db service.
        await db.publishResult(resultToPublish);
        setOfficialResult(resultToPublish);
        setDraftResult(null); 
        alert(`Resultados para ${selectedGp.name} publicados. Los puntajes serán recalculados.`);
        setLoading(false);
    };

    const handleFieldChange = (field: keyof Omit<Result, 'gpId'>, value: any) => {
        setEditableResult(prev => ({...prev, [field]: value}));
        const reason = prompt(`Motivo para el cambio manual de "${field}":`);
        if (reason && user) {
            setManualOverrides(prev => ({...prev, [field]: { user: user.username, reason }}));
        }
    };
    
    const handleUndoChanges = () => {
        if (!selectedGp) return;
        if (window.confirm("¿Estás seguro de que quieres deshacer todos los cambios? Se restaurará la última versión guardada.")) {
            // Restore from the pristine initial state, deep-copying again to be safe
            setEditableResult(JSON.parse(JSON.stringify(initialResult)));
            setManualOverrides(JSON.parse(JSON.stringify(initialManualOverrides)));
        }
    };
    
    const DriverSelect: React.FC<{id: string, value?: string, onChange: (e:React.ChangeEvent<HTMLSelectElement>) => void, isManual: boolean}> = ({id, value, onChange, isManual}) => (
        <select value={value || ''} onChange={onChange} className={`w-full p-2 bg-[var(--background-light)] rounded border ${isManual ? 'border-2 border-yellow-400' : 'border-[var(--border-color)]'}`}>
            <option value="">N/A</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
    );

    const ResultRow:React.FC<{field: keyof Omit<Result, 'gpId'>, label:string}> = ({field, label}) => {
        const isManual = !!manualOverrides[field];
        const draftValue = draftResult ? (draftResult as any)[field] : undefined;
        const editableValue = editableResult ? (editableResult as any)[field] : undefined;
        
        if (field === 'racePodium' || field === 'sprintPodium') {
            return (
                <tr>
                    <td className="py-2 font-semibold">{label}</td>
                    <td className="py-2 text-center text-sm text-[var(--text-secondary)]">{draftValue?.map((d:string) => drivers.find(dr => dr.id === d)?.name || 'N/A').join(', ') || 'N/A'}</td>
                    <td className="py-2">
                        <div className="space-y-2">
                         {Array.from({ length: 3 }).map((_, i) => (
                             <DriverSelect 
                                key={i} 
                                id={`${field}-${i}`} 
                                value={(editableValue && editableValue[i]) || ''} 
                                onChange={(e) => {
                                    // Using null instead of undefined for empty values to prevent sparse arrays
                                    const currentPodium = [...(editableValue || [null, null, null])];
                                    currentPodium[i] = e.target.value || null;
                                    handleFieldChange(field, currentPodium);
                                }} 
                                isManual={isManual}/>
                         ))}
                        </div>
                    </td>
                </tr>
            )
        }
        
        return (
             <tr>
                <td className="py-2 font-semibold">{label}</td>
                <td className="py-2 text-center text-sm text-[var(--text-secondary)]">{drivers.find(d => d.id === draftValue)?.name || 'N/A'}</td>
                <td className="py-2"><DriverSelect id={field} value={editableValue} onChange={(e) => handleFieldChange(field, e.target.value)} isManual={isManual} /></td>
            </tr>
        )
    };

    if (loadingData) return <p>Cargando datos de administrador...</p>

    return (
        <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
            <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Resultados</h2>
            <select onChange={(e) => setSelectedGp(gps.find(gp => gp.id === Number(e.target.value)) || null)} className="mb-4 bg-[var(--background-light)] p-2 rounded w-full max-w-xs border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]">
                <option>Seleccionar un Gran Premio...</option>
                {gps.map(gp => <option key={gp.id} value={gp.id}>{gp.name}</option>)}
            </select>

            {selectedGp && (loading ? <p>Cargando datos del GP...</p> :
                <div>
                    {officialResult && <p className="text-green-400 mt-2 text-sm">Estos resultados ya han sido publicados el {new Date(officialResult.publishedAt).toLocaleDateString()}.</p>}
                    
                    <table className="w-full mt-6 text-left">
                        <thead className="border-b-2 border-[var(--border-color)]">
                            <tr>
                                <th className="w-1/4 py-2">Campo</th>
                                <th className="w-1/4 py-2 text-center">Borrador (IA)</th>
                                <th className="w-1/2 py-2">Oficial / Editable</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            <ResultRow field="pole" label="Pole Position" />
                            {selectedGp.hasSprint && <ResultRow field="sprintPole" label="Sprint Pole" />}
                            {selectedGp.hasSprint && <ResultRow field="sprintPodium" label="Podio Sprint" />}
                            <ResultRow field="racePodium" label="Podio Carrera" />
                            <ResultRow field="fastestLap" label="Vuelta Rápida" />
                            <ResultRow field="driverOfTheDay" label="Piloto del Día" />
                        </tbody>
                    </table>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                        <button onClick={handlePublish} disabled={loading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                            {loading ? "Publicando..." : (officialResult ? "Actualizar Resultados" : "Publicar Resultados Oficiales")}
                        </button>
                         <button type="button" onClick={handleUndoChanges} disabled={loading} className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                            Deshacer Cambios
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
