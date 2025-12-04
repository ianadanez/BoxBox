
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { GrandPrix } from '../types';

export const CalendarManagement: React.FC = () => {
    const [schedule, setSchedule] = useState<GrandPrix[]>([]);
    const [formState, setFormState] = useState<Partial<GrandPrix> | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await db.getSchedule();
        setSchedule(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEdit = (gp: GrandPrix) => {
        setFormState({ ...gp });
        setIsNew(false);
        window.scrollTo(0, 0);
    };

    const handleAddNew = () => {
        setFormState({
            id: undefined,
            name: '',
            country: '',
            track: '',
            hasSprint: false,
            events: { quali: '', race: '' }
        });
        setIsNew(true);
        window.scrollTo(0, 0);
    };

    const handleCancel = () => {
        setFormState(null);
        setIsNew(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('events.')) {
            const eventName = name.split('.')[1] as 'quali' | 'sprint' | 'race' | 'sprintQuali';
            setFormState(prev => prev ? { ...prev, events: { ...prev.events, [eventName]: new Date(value).toISOString() } } : null);
        } else {
            setFormState(prev => prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : null);
        }
    };
    
    const toInputDateTime = (isoDate?: string) => {
        if (!isoDate) return '';
        try {
            const date = new Date(isoDate);
            if(isNaN(date.getTime())) return '';
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        } catch(e) { return ''; }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState || !formState.name || !formState.country || !formState.track || !formState.events?.quali || !formState.events?.race) {
            alert("Todos los campos (excepto los de Sprint) son requeridos.");
            return;
        }
        if (formState.hasSprint && (!formState.events?.sprint || !formState.events?.sprintQuali)) {
            alert("Las fechas del Sprint y de la Clasificación del Sprint son requeridas si la opción está activada.");
            return;
        }

        let gpToSave: GrandPrix;

        if (isNew) {
            const maxId = schedule.reduce((max, gp) => Math.max(gp.id, max), 0);
            gpToSave = { ...formState, id: maxId + 1 } as GrandPrix;
        } else {
            gpToSave = formState as GrandPrix;
        }

        if (!gpToSave.hasSprint) {
            delete gpToSave.events.sprint;
            delete gpToSave.events.sprintQuali;
        }

        await db.saveGp(gpToSave);
        await loadData();
        handleCancel();
    };
    
    const handleDeleteGp = async (gp: GrandPrix) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el GP "${gp.name}"? Esta acción no se puede deshacer.`)) {
            setLoading(true);
            try {
                await db.deleteGp(gp.id);
                await loadData();
            } catch (error) {
                console.error("Error deleting GP:", error);
                alert("Hubo un error al eliminar el Gran Premio.");
            }
            setLoading(false);
        }
    };

    const handleResetAndSeed = async () => {
        if (window.confirm("¿Estás seguro? Esto reemplazará los equipos, pilotos, calendario y usuarios de prueba en Firebase con los datos iniciales. Esta acción no se puede deshacer.")) {
            setLoading(true);
            try {
                await db.seedFirebase();
                alert("Base de datos de Firebase inicializada con éxito.");
                await loadData();
            } catch (error) {
                alert(`Error al inicializar la base de datos: ${error}`);
            }
            setLoading(false);
        }
    };

    return (
        <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
            <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Calendario</h2>
            <div className="mb-4 space-x-4">
                <button onClick={handleResetAndSeed} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                    {loading ? 'Inicializando...' : 'Resetear y Sembrar Firebase'}
                </button>
            </div>


            {formState && (
                <form onSubmit={handleSubmit} className="mb-8 bg-[var(--background-light)]/50 p-4 rounded-lg space-y-4 border border-[var(--border-color)]">
                    <h3 className="text-xl font-semibold">{isNew ? 'Agregar Nuevo GP' : `Editando: ${formState.name}`}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" name="name" placeholder="Nombre del GP" value={formState.name || ''} onChange={handleFormChange} required className="p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        <input type="text" name="country" placeholder="País" value={formState.country || ''} onChange={handleFormChange} required className="p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        <input type="text" name="track" placeholder="Circuito" value={formState.track || ''} onChange={handleFormChange} required className="p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="block text-sm text-[var(--text-secondary)]">Clasificación (tu hora local)</label>
                           <input type="datetime-local" name="events.quali" value={toInputDateTime(formState.events?.quali)} onChange={handleFormChange} required className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        </div>
                        <div>
                           <label className="block text-sm text-[var(--text-secondary)]">Carrera (tu hora local)</label>
                           <input type="datetime-local" name="events.race" value={toInputDateTime(formState.events?.race)} onChange={handleFormChange} required className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        </div>
                         <div className="flex items-end">
                            <label className="flex items-center space-x-2 text-[var(--text-primary)]">
                                <input type="checkbox" name="hasSprint" checked={formState.hasSprint || false} onChange={handleFormChange} className="h-5 w-5 rounded bg-[var(--background-light)] border-[var(--border-color)] text-[var(--accent-red)] focus:ring-[var(--accent-red)]" />
                                <span>Tiene Sprint</span>
                            </label>
                        </div>
                    </div>
                    {formState.hasSprint && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)]">Clasificación Sprint (tu hora local)</label>
                                <input type="datetime-local" name="events.sprintQuali" value={toInputDateTime(formState.events?.sprintQuali)} onChange={handleFormChange} required={formState.hasSprint} className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)]">Sprint (tu hora local)</label>
                                <input type="datetime-local" name="events.sprint" value={toInputDateTime(formState.events?.sprint)} onChange={handleFormChange} required={formState.hasSprint} className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                            </div>
                        </div>
                    )}
                    <div className="flex space-x-4">
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Guardar</button>
                        <button type="button" onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancelar</button>
                    </div>
                </form>
            )}

            <div className="flex justify-end mb-4">
                <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors w-full sm:w-auto">
                    + Agregar Nuevo GP
                </button>
            </div>

            <div className="overflow-x-auto">
                {loading ? <p>Cargando calendario...</p> : (
                 <table className="w-full text-left">
                    <thead className="bg-[var(--background-light)]">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Fecha de Carrera</th>
                            <th className="p-3 text-center">Sprint</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.map(gp => (
                            <tr key={gp.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-light)]/50">
                                <td className="p-3 font-medium">{gp.name}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{new Date(gp.events.race).toLocaleString()}</td>
                                <td className="p-3 text-center">{gp.hasSprint ? '✓' : '✗'}</td>
                                <td className="p-3 text-right space-x-2">
                                    <button onClick={() => handleEdit(gp)} className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-1 px-3 rounded-md transition-colors">Editar</button>
                                    <button onClick={() => handleDeleteGp(gp)} className="bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors">Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                )}
            </div>
        </div>
    );
};
