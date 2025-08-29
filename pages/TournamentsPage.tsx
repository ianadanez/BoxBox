
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { Tournament, User, SeasonTotal } from '../types';
import Avatar from '../components/common/Avatar';
import { useNavigate, Link } from 'react-router-dom';
import GoogleAd from '../components/common/GoogleAd';

const TournamentsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [tournamentMembers, setTournamentMembers] = useState<User[]>([]);
    const [tournamentPendingMembers, setTournamentPendingMembers] = useState<User[]>([]);
    const [tournamentRanking, setTournamentRanking] = useState<SeasonTotal[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const [view, setView] = useState<'list' | 'create' | 'join'>('list');
    const [inviteCode, setInviteCode] = useState('');
    const [newTournamentName, setNewTournamentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for invite functionality
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteSuggestions, setInviteSuggestions] = useState<User[]>([]);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const [allTournaments, allUsersData] = await Promise.all([
            db.getTournaments(),
            db.getUsers()
        ]);
        const userTournaments = allTournaments.filter(t => t.memberIds.includes(user.id));
        setMyTournaments(userTournaments);
        setAllUsers(allUsersData);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user, navigate, loadData]);

    useEffect(() => {
        const loadTournamentDetails = async () => {
            if (selectedTournament) {
                setLoading(true);
                const [seasonTotals] = await Promise.all([
                    db.calculateSeasonTotals() // Note: Heavy operation
                ]);
                const members = allUsers.filter(u => selectedTournament.memberIds.includes(u.id));
                const pendingMembers = allUsers.filter(u => selectedTournament.pendingMemberIds?.includes(u.id));
                setTournamentMembers(members);
                setTournamentPendingMembers(pendingMembers);

                const rankedMembers = seasonTotals
                    .filter(st => selectedTournament.memberIds.includes(st.userId))
                    .sort((a, b) => b.totalPoints - a.totalPoints);
                setTournamentRanking(rankedMembers);
                setLoading(false);
            } else {
                setTournamentMembers([]);
                setTournamentPendingMembers([]);
                setTournamentRanking([]);
            }
        };
        loadTournamentDetails();
    }, [selectedTournament, allUsers]);

    useEffect(() => {
        setInviteSearchQuery('');
        setInviteSuggestions([]);
    }, [selectedTournament]);

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTournamentName.trim() || !user || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const tournamentData: Omit<Tournament, 'id' | 'pendingMemberIds'> = {
                name: newTournamentName,
                inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                creatorId: user.id,
                memberIds: [user.id]
            };
            await db.addTournament(tournamentData);
            await loadData();
            setNewTournamentName('');
            setView('list');
        } catch (error) {
            console.error("Error creating tournament:", error);
            alert("Hubo un error al crear el torneo. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleJoinTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim() || !user || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const tournament = await db.findTournamentByCode(inviteCode);
            if (tournament) {
                if (!tournament.memberIds.includes(user.id)) {
                    tournament.memberIds.push(user.id);
                    await db.saveTournament(tournament);
                    await loadData();
                    alert(`¡Te uniste a "${tournament.name}" con éxito!`);
                    setInviteCode('');
                    setView('list');
                } else {
                    alert('Ya eres miembro de este torneo.');
                }
            } else {
                alert('Código de invitación no válido.');
            }
        } catch (error) {
            console.error("Error joining tournament:", error);
            alert("Hubo un error al unirse al torneo. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleInviteSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setInviteSearchQuery(query);
        if (query.length > 1 && selectedTournament) {
            const suggestions = allUsers.filter(u =>
                u.name.toLowerCase().includes(query.toLowerCase()) &&
                !selectedTournament.memberIds.includes(u.id) &&
                !selectedTournament.pendingMemberIds?.includes(u.id)
            );
            setInviteSuggestions(suggestions);
        } else {
            setInviteSuggestions([]);
        }
    };
    
    const handleSendInvite = async (invitedUser: User) => {
        if (!user || !selectedTournament) return;
        
        const result = await db.sendTournamentInvite(user.id, invitedUser.id, selectedTournament.id, selectedTournament.name);
        
        if (result) {
            alert(`Se ha enviado una invitación a ${invitedUser.name}.`);
            // Optimistically update UI
            setTournamentPendingMembers(prev => [...prev, invitedUser]);
            setSelectedTournament(prev => prev ? ({ ...prev, pendingMemberIds: [...(prev.pendingMemberIds || []), invitedUser.id] }) : null);
        } else {
            alert(`${invitedUser.name} ya es miembro o tiene una invitación pendiente.`);
        }
        
        // Remove user from suggestions and clear search
        setInviteSuggestions(prev => prev.filter(u => u.id !== invitedUser.id));
        setInviteSearchQuery('');
    };

    const handleLeaveTournament = async () => {
        if (!user || !selectedTournament) return;
        if (window.confirm(`¿Estás seguro de que quieres salir del torneo "${selectedTournament.name}"?`)) {
            setIsSubmitting(true);
            try {
                await db.leaveTournament(user.id, selectedTournament.id);
                alert('Has salido del torneo.');
                setSelectedTournament(null);
                await loadData();
            } catch (error) {
                console.error("Error leaving tournament:", error);
                alert('Hubo un error al salir del torneo.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDeleteTournament = async () => {
        if (!user || !selectedTournament || user.id !== selectedTournament.creatorId) return;
        if (window.confirm(`¿Estás SEGURO de que quieres ELIMINAR el torneo "${selectedTournament.name}"? Esta acción no se puede deshacer.`)) {
            setIsSubmitting(true);
            try {
                await db.deleteTournament(selectedTournament.id);
                alert('Torneo eliminado.');
                setSelectedTournament(null);
                await loadData();
            } catch (error) {
                console.error("Error deleting tournament:", error);
                alert('Hubo un error al eliminar el torneo.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (loading && !selectedTournament) {
        return <div className="text-center p-8">Cargando torneos...</div>
    }

    if (!user) {
        return null;
    }
    
    if (selectedTournament) {
        const isCreator = user?.id === selectedTournament.creatorId;
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <button onClick={() => setSelectedTournament(null)} className="self-start text-[var(--accent-red)] hover:opacity-80 transition-opacity">&larr; Volver a mis torneos</button>
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        {!isCreator && (
                            <button onClick={handleLeaveTournament} disabled={isSubmitting} className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded-md transition-opacity disabled:opacity-50">
                                {isSubmitting ? 'Saliendo...' : 'Salir del Torneo'}
                            </button>
                        )}
                        {isCreator && (
                            <button onClick={handleDeleteTournament} disabled={isSubmitting} className="w-full sm:w-auto bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-opacity disabled:opacity-50">
                                {isSubmitting ? 'Eliminando...' : 'Eliminar Torneo'}
                            </button>
                        )}
                    </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{selectedTournament.name}</h1>
                <p className="text-[var(--text-secondary)] mb-6">Código de invitación: <span className="font-mono bg-[var(--background-light)] text-[var(--text-primary)] py-1 px-2 rounded-md">{selectedTournament.inviteCode}</span></p>
                {loading ? <p>Cargando ranking...</p> : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                            <h2 className="text-2xl font-bold f1-red-text mb-4">Ranking del Torneo</h2>
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-[var(--border-color)]">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-center">Pos</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide" colSpan={2}>Usuario</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide text-right">Puntos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tournamentRanking.map((score, index) => (
                                        <tr key={score.userId} className="border-b border-[var(--border-color)]">
                                            <td className="p-3 text-lg font-bold text-center text-[var(--text-secondary)]">{index + 1}</td>
                                            <td className="p-2">
                                                <Link to={`/profile/${score.userId}`}>
                                                    <Avatar avatar={score.userAvatar} className="w-10 h-10" />
                                                </Link>
                                            </td>
                                            <td className="p-2 font-medium">
                                                <Link to={`/profile/${score.userId}`} className="hover:text-[var(--accent-red)] transition-colors">
                                                    {score.userName}
                                                </Link>
                                            </td>
                                            <td className="p-3 text-right font-mono text-lg font-bold text-[var(--accent-blue)]">{score.totalPoints}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:col-span-1 bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
                            <h2 className="text-2xl font-bold f1-red-text mb-4">Miembros</h2>
                            
                            {isCreator && (
                                <div className="bg-[var(--background-light)] p-4 rounded-lg mb-4 border border-[var(--border-color)]">
                                    <h3 className="text-lg font-bold mb-3 text-white">Invitar Miembros</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar usuario..."
                                            value={inviteSearchQuery}
                                            onChange={handleInviteSearchChange}
                                            className="w-full p-2 bg-[var(--background-medium)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"
                                        />
                                        {inviteSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full mt-1 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {inviteSuggestions.map(u => (
                                                    <li key={u.id} className="p-2 flex justify-between items-center hover:bg-[var(--background-light)]">
                                                        <span>{u.name}</span>
                                                        <button onClick={() => handleSendInvite(u)} className="text-sm bg-[var(--accent-blue)] text-black font-bold py-1 px-3 rounded-md hover:opacity-80 transition-opacity">Invitar</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            <ul className="space-y-3">
                                {tournamentMembers.map(member => (
                                    <li key={member.id}>
                                        <Link to={`/profile/${member.id}`} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-[var(--background-light)] transition-colors">
                                            <Avatar avatar={member.avatar} className="w-10 h-10 flex-shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-bold text-white">{member.name}</p>
                                                {member.id === selectedTournament.creatorId && (
                                                    <p className="text-xs text-[var(--accent-blue)]">Creador</p>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                             {isCreator && tournamentPendingMembers.length > 0 && (
                                <>
                                    <h3 className="text-xl font-bold mt-6 mb-3">Invitaciones Pendientes</h3>
                                    <ul className="space-y-3">
                                        {tournamentPendingMembers.map(member => (
                                            <li key={member.id} className="flex items-center space-x-4 p-2 rounded-lg bg-[var(--background-light)]/50">
                                                <Avatar avatar={member.avatar} className="w-10 h-10 flex-shrink-0" />
                                                <p className="font-bold text-gray-400">{member.name}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h1 className="text-3xl font-bold mb-4 sm:mb-0">Mis Torneos</h1>
                {view === 'list' && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button onClick={() => setView('create')} className="bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-2 px-4 rounded-md transition-opacity">
                            Crear Torneo
                        </button>
                        <button onClick={() => setView('join')} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Unirse a un Torneo
                        </button>
                    </div>
                )}
            </div>
            
            {view === 'create' ? (
                <div className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)] max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold f1-red-text mb-4">Crear Nuevo Torneo</h2>
                    <form onSubmit={handleCreateTournament} className="space-y-4">
                        <div>
                            <label htmlFor="tournamentName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre del Torneo</label>
                            <input
                                id="tournamentName"
                                type="text"
                                value={newTournamentName}
                                onChange={(e) => setNewTournamentName(e.target.value)}
                                required
                                className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-red)]"
                                placeholder="Ej: Liga de Campeones F1"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                             <button type="submit" disabled={isSubmitting} className="w-full bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-3 px-4 rounded-md transition-opacity disabled:opacity-50">
                                {isSubmitting ? 'Creando...' : 'Crear Torneo'}
                            </button>
                            <button type="button" onClick={() => setView('list')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            ) : view === 'join' ? (
                 <div className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)] max-w-lg mx-auto">
                    <h2 className="text-2xl font-bold f1-red-text mb-4">Unirse a un Torneo</h2>
                    <form onSubmit={handleJoinTournament} className="space-y-4">
                        <div>
                            <label htmlFor="inviteCode" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Código de Invitación</label>
                            <input
                                id="inviteCode"
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                required
                                className="w-full p-2 bg-[var(--background-light)] rounded border border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent-blue)] font-mono tracking-widest"
                                placeholder="CÓDIGO"
                            />
                        </div>
                         <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-[var(--accent-blue)] hover:opacity-80 text-black font-bold py-3 px-4 rounded-md transition-opacity disabled:opacity-50">
                                {isSubmitting ? 'Uniéndote...' : 'Unirse al Torneo'}
                            </button>
                             <button type="button" onClick={() => setView('list')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myTournaments.map(t => (
                            <div key={t.id} onClick={() => setSelectedTournament(t)} className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)] cursor-pointer hover:border-[var(--accent-red)] transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-900/20">
                                <h3 className="text-xl font-bold truncate mb-2">{t.name}</h3>
                                <p className="text-[var(--text-secondary)]">{t.memberIds.length} miembro(s)</p>
                            </div>
                        ))}
                        {myTournaments.length === 0 && (
                            <p className="col-span-full text-center text-[var(--text-secondary)] p-8">No eres miembro de ningún torneo todavía.</p>
                        )}
                    </div>
                    {view === 'list' && (
                        <div className="mt-12">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center mb-4">Publicidad</h2>
                            <GoogleAd slot="REEMPLAZA_CON_ID_TORNEOS" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TournamentsPage;
