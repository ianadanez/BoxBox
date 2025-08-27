
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { geminiService } from '../services/geminiService';
import { GrandPrix, Driver, Team, Result, OfficialResult, PointAdjustment, User } from '../types';

type AdminTab = 'results' | 'users' | 'calendar' | 'drivers';

const AdminPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<AdminTab>('results');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') {
        return <div className="text-center p-8">Acceso denegado.</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
            <div className="flex border-b border-[var(--border-color)] mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'results' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Resultados</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Usuarios</button>
                <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'calendar' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Calendario</button>
                <button onClick={() => setActiveTab('drivers')} className={`px-4 py-2 text-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'drivers' ? 'f1-red-text border-b-2 border-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>Pilotos y Equipos</button>
            </div>
            <div>
                {activeTab === 'results' && <ResultsManagement />}
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'calendar' && <CalendarManagement />}
                {activeTab === 'drivers' && <DriversManagement />}
            </div>
        </div>
    );
};

const UsersManagement: React.FC = () => {
    const { user: adminUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [adjustments, setAdjustments] = useState<PointAdjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    const [points, setPoints] = useState<string>('0');
    const [reason, setReason] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        const [usersData, adjustmentsData] = await Promise.all([
            db.getUsers(),
            db.getPointAdjustments()
        ]);
        setUsers(usersData);
        setAdjustments(adjustmentsData);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        setSelectedUser(null);
        if(query.length > 0) {
            setSuggestions(users.filter(u => u.name.toLowerCase().includes(query.toLowerCase())));
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchQuery(user.name);
        setSuggestions([]);
    };
    
    const handlePointsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pointsValue = parseInt(points, 10) || 0;
        if (!selectedUser || pointsValue === 0 || !reason.trim() || !adminUser) {
            alert("Por favor, complete todos los campos: usuario, puntos (distinto de cero) y motivo.");
            return;
        }
        
        setLoading(true);
        await db.addPointAdjustment({
            userId: selectedUser.id,
            points: pointsValue,
            reason,
            adminId: adminUser.id,
        });

        alert("Ajuste de puntos guardado con éxito.");
        setPoints('0');
        setReason('');
        setSearchQuery('');
        setSelectedUser(null);
        await loadData();
    };

    const handleRoleChange = async (userToUpdate: User) => {
        const newRole = userToUpdate.role === 'admin' ? 'user' : 'admin';
        const action = newRole === 'admin' ? 'ascender a administrador' : 'degradar a usuario';
        
        if (window.confirm(`¿Estás seguro de que quieres ${action} a ${userToUpdate.name}?`)) {
            setUpdatingRoleId(userToUpdate.id);
            try {
                await db.saveUser({ ...userToUpdate, role: newRole });
                setUsers(prevUsers => prevUsers.map(u => 
                    u.id === userToUpdate.id ? { ...u, role: newRole } : u
                ));
            } catch (error) {
                console.error("Error changing user role:", error);
                alert("No se pudo cambiar el rol del usuario.");
            } finally {
                setUpdatingRoleId(null);
            }
        }
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Usuario desconocido';

    return (
        <div className="space-y-8">
            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Puntos Manual</h2>
                
                <form onSubmit={handlePointsSubmit} className="mb-8 bg-[var(--background-light)]/50 p-4 rounded-lg space-y-4 border border-[var(--border-color)]">
                     <h3 className="text-xl font-semibold">Asignar o Quitar Puntos</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="relative">
                            <label htmlFor="userSearch" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Usuario</label>
                            <input
                                id="userSearch"
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Escriba para buscar..."
                                autoComplete="off"
                                className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"
                            />
                             {suggestions.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {suggestions.map(u => (
                                        <li key={u.id} onClick={() => handleSelectUser(u)} className="p-2 cursor-pointer hover:bg-[var(--background-light)]">{u.name}</li>
                                    ))}
                                </ul>
                            )}
                         </div>
                         <div>
                            <label htmlFor="points" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Puntos (usar - para quitar)</label>
                            <input type="number" id="points" value={points} onChange={(e) => setPoints(e.target.value)} className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]" />
                         </div>
                         <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Motivo</label>
                            <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]" />
                         </div>
                     </div>
                     <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:opacity-50">
                        {loading ? 'Guardando...' : 'Guardar Ajuste'}
                     </button>
                </form>
                
                <h3 className="text-xl font-semibold mb-4">Historial de Ajustes</h3>
                <div className="overflow-x-auto">
                     {loading && adjustments.length === 0 ? <p>Cargando...</p> : (
                        <table className="w-full text-left">
                            <thead className="bg-[var(--background-light)]">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Usuario</th>
                                    <th className="p-3 text-right">Puntos</th>
                                    <th className="p-3">Motivo</th>
                                    <th className="p-3">Admin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adjustments.map(adj => (
                                    <tr key={adj.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-light)]/50">
                                        <td className="p-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">{new Date(adj.timestamp).toLocaleString()}</td>
                                        <td className="p-3 font-medium">{getUserName(adj.userId)}</td>
                                        <td className={`p-3 text-right font-bold font-mono ${adj.points > 0 ? 'text-green-400' : 'text-red-400'}`}>{adj.points > 0 ? `+${adj.points}` : adj.points}</td>
                                        <td className="p-3">{adj.reason}</td>
                                        <td className="p-3 text-[var(--text-secondary)]">{getUserName(adj.adminId)}</td>
                                    </tr>
                                ))}
                                {adjustments.length === 0 && !loading && (
                                    <tr><td colSpan={5} className="text-center p-8 text-[var(--text-secondary)]">No se han realizado ajustes manuales.</td></tr>
                                )}
                            </tbody>
                        </table>
                     )}
                </div>
            </div>

            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Roles de Usuario</h2>
                <div className="overflow-x-auto">
                    {loading ? <p>Cargando usuarios...</p> : (
                        <table className="w-full text-left">
                            <thead className="bg-[var(--background-light)]">
                                <tr>
                                    <th className="p-3">Nombre</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Rol Actual</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-light)]/50">
                                        <td className="p-3 font-medium">{user.name}</td>
                                        <td className="p-3 text-[var(--text-secondary)]">{user.email}</td>
                                        <td className="p-3 capitalize">{user.role}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => handleRoleChange(user)}
                                                disabled={user.id === adminUser?.id || updatingRoleId === user.id}
                                                className={`font-bold py-1 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    user.role === 'user' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-black'
                                                }`}
                                            >
                                                {updatingRoleId === user.id ? 'Cambiando...' : (user.role === 'user' ? 'Hacer Admin' : 'Hacer Usuario')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const CalendarManagement: React.FC = () => {
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
            const eventName = name.split('.')[1] as 'quali' | 'sprint' | 'race';
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
            alert("Todos los campos (excepto Sprint) son requeridos.");
            return;
        }
        if (formState.hasSprint && !formState.events?.sprint) {
            alert("La fecha del Sprint es requerida si la opción está activada.");
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
        }

        await db.saveGp(gpToSave);
        await loadData();
        handleCancel();
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

    const handleFetchFromAI = async () => {
        if (!window.confirm("¿Seguro que quieres reemplazar el calendario actual con datos de la IA para 2025?")) return;
        setLoading(true);
        try {
            const newSchedule = await geminiService.fetchSchedule(2025);
            if (newSchedule) {
                await db.replaceSchedule(newSchedule);
                await loadData();
                alert("Calendario actualizado desde la IA.");
            }
        } catch (error) {
             console.error("Error fetching schedule from Gemini:", error);
             alert("No se pudo cargar el calendario automáticamente desde la IA.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
            <h2 className="text-2xl font-bold f1-red-text mb-4">Gestión de Calendario</h2>
            <div className="mb-4 space-x-4">
                <button onClick={handleResetAndSeed} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                    {loading ? 'Inicializando...' : 'Resetear y Sembrar Firebase'}
                </button>
                 <button onClick={handleFetchFromAI} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                    {loading ? 'Cargando...' : 'Cargar Calendario 2025 con IA'}
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
                        <div>
                           <label className="block text-sm text-[var(--text-secondary)]">Sprint (tu hora local)</label>
                           <input type="datetime-local" name="events.sprint" value={toInputDateTime(formState.events?.sprint)} onChange={handleFormChange} required={formState.hasSprint} className="w-full md:w-1/3 p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"/>
                        </div>
                    )}
                    <div className="flex space-x-4">
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Guardar</button>
                        <button type="button" onClick={handleCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancelar</button>
                    </div>
                </form>
            )}

            <div className="flex justify-end mb-4">
                <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
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
                                <td className="p-3 text-right">
                                    <button onClick={() => handleEdit(gp)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-md transition-colors">Editar</button>
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


const DriversManagement: React.FC = () => {
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
                <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
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
                                    <button onClick={() => handleEdit(driver)} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded-md transition-colors">Editar</button>
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

const ResultsManagement: React.FC = () => {
    const { user } = useAuth();
    const [gps, setGps] = useState<GrandPrix[]>([]);
    const [selectedGp, setSelectedGp] = useState<GrandPrix | null>(null);
    const [draftResult, setDraftResult] = useState<Result | null>(null);
    const [officialResult, setOfficialResult] = useState<OfficialResult | null>(null);
    const [editableResult, setEditableResult] = useState<Partial<Result>>({});
    const [manualOverrides, setManualOverrides] = useState<OfficialResult['manualOverrides']>({});
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
                setDraftResult(draft || null);
                setOfficialResult(official || null);
                setEditableResult(official || draft || { gpId: selectedGp.id });
                setManualOverrides(official?.manualOverrides || {});
                setLoading(false);
            } else {
                setDraftResult(null);
                setOfficialResult(null);
                setEditableResult({});
            }
        };
        loadGpData();
    }, [selectedGp]);
    
    const handleFetchResults = async () => {
        if (!selectedGp) return;
        setLoading(true);
        try {
            const newDraft = await geminiService.fetchDraftResults(selectedGp, drivers);
            if (newDraft) {
                await db.saveDraftResult(newDraft);
                setDraftResult(newDraft);
                const currentOfficial = await db.getOfficialResult(selectedGp.id);
                const overriddenKeys = Object.keys(currentOfficial?.manualOverrides || {});
                
                const newEditable = {...editableResult, ...newDraft};
                overriddenKeys.forEach(key => {
                     (newEditable as any)[key] = (currentOfficial as any)[key];
                })
                setEditableResult(newEditable);
            }
        } catch(error) {
            console.error("Error fetching draft results from Gemini:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if(!selectedGp || !user) return;
        setLoading(true);
        const resultToPublish: OfficialResult = {
            ...(editableResult as Result),
            gpId: selectedGp.id,
            publishedAt: new Date().toISOString(),
            manualOverrides: manualOverrides
        };
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
            setManualOverrides(prev => ({...prev, [field]: { user: user.name, reason }}));
        } else {
            // User cancelled, do not mark as override
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
                         {(editableValue || [null, null, null]).map((val: string, i: number) => (
                             <DriverSelect key={i} id={`${field}-${i}`} value={val} onChange={(e) => handleFieldChange(field, [...(editableValue || []).slice(0,i), e.target.value, ...(editableValue || []).slice(i+1)])} isManual={isManual}/>
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
                     <button onClick={handleFetchResults} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                        {loading ? 'Obteniendo datos...' : 'Obtener Borrador de Resultados (IA)'}
                    </button>
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

                    <button onClick={handlePublish} disabled={loading} className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                        {loading ? "Publicando..." : "Publicar Resultados Oficiales"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
