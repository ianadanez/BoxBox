
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Driver, Team } from '../types';

export const DriversManagement: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [formState, setFormState] = useState<Partial<Driver> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [driversData, teamsData] = await Promise.all([db.getDrivers(), db.getTeams()]);
        setDrivers(driversData.sort((a,b) => a.name.localeCompare(b.name)));
        setTeams(teamsData);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEdit = (driver: Driver) => {
        setFormState({...driver});
        setIsNew(false);
        window.scrollTo(0, 0);
    };

    const handleAddNew = () => {
        setFormState({ id: '', name: '', teamId: teams[0]?.id || '', isActive: true });
        setIsNew(true);
        window.scrollTo(0, 0);
    };

    const handleCancel = () => {
        setFormState(null);
        setIsNew(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormState(prev => prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState || !formState.name || !formState.teamId) {
            alert("Nombre y equipo son requeridos.");
            return;
        }

        let driverToSave: Driver;

        if (isNew) {
            const newId = formState.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
            if (!newId || drivers.some(d => d.id === newId)) {
                alert("No se pudo generar un ID único para el piloto. El ID derivado del nombre ya existe o está vacío. Intente con un nombre diferente.");
                return;
            }
            driverToSave = { ...formState, id: newId } as Driver;
        } else {
            driverToSave = formState as Driver;
        }

        await db.saveDriver(driverToSave);
        await loadData();
        handleCancel();
    };
    
    return (
        <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
             <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Pilotos</h2>
            
             {formState && (
                <form onSubmit={handleSubmit} className="mb-8 bg-[var(--background-light)]/50 p-4 rounded-lg space-y-4 border border-[var(--border-color)]">
                    <h3 className="text-xl font-semibold">{isNew ? 'Agregar Nuevo Piloto' : `Editando: ${formState.name}`}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nombre</label>
                            <input type="text" name="name" id="name" value={formState.name || ''} onChange={handleFormChange} required className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        </div>
                        <div>
                            <label htmlFor="teamId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Equipo</label>
                            <select name="teamId" id="teamId" value={formState.teamId || ''} onChange={handleFormChange} required className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]">
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                             <label className="flex items-center space-x-2 text-[var(--text-primary)]">
                                <input type="checkbox" name="isActive" checked={formState.isActive || false} onChange={handleFormChange} className="h-5 w-5 rounded bg-[var(--background-light)] border-[var(--border-color)] text-[var(--accent-red)] focus:ring-[var(--accent-red)]" />
                                <span>Activo</span>
                            </label>
                        </div>
                    </div>
                     {isNew && <p className="text-xs text-[var(--text-secondary)]">El ID del piloto se generará automáticamente a partir del nombre.</p>}
                     <div className="flex space-x-4">
                         <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Guardar</button>
                         <button type="button" onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancelar</button>
                     </div>
                </form>
             )}

            <div className="flex justify-end mb-4">
                <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-full sm:w-auto">
                    + Agregar Nuevo Piloto
                </button>
            </div>
            
            <div className="overflow-x-auto">
                {loading ? <p>Cargando pilotos...</p> : (
                 <table className="w-full text-left">
                    <thead className="bg-[var(--background-light)]">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Equipo</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {drivers.map(driver => (
                            <tr key={driver.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-light)]/50">
                                <td className="p-3 font-medium">{driver.name}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{teams.find(t => t.id === driver.teamId)?.name || 'N/A'}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${driver.isActive ? 'bg-green-500 text-green-900' : 'bg-red-800 text-red-100'}`}>
                                        {driver.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleEdit(driver)} className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-1 px-3 rounded-md transition-colors">Editar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                )}
            </div>
        </div>
    );
}
