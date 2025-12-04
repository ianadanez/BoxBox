
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { User, PointAdjustment } from '../types';

export const UsersManagement: React.FC = () => {
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
            setSuggestions(users.filter(u => u.username.toLowerCase().includes(query.toLowerCase())));
        } else {
            setSuggestions([]);
        }
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchQuery(user.username);
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
        
        if (window.confirm(`¿Estás seguro de que quieres ${action} a ${userToUpdate.username}?`)) {
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

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.username || 'Usuario desconocido';

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
                                        <li key={u.id} onClick={() => handleSelectUser(u)} className="p-2 cursor-pointer hover:bg-[var(--background-light)]">{u.username}</li>
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
                                    <th className="p-3">Nombre de usuario</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Rol Actual</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-light)]/50">
                                        <td className="p-3 font-medium">{user.username}</td>
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
