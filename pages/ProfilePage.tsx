

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar as AvatarType, GpScore, User, SeasonTotal } from '../types';
import Avatar from '../components/common/Avatar';
import AvatarEditor from '../components/common/AvatarEditor';
import { db } from '../services/db';
import GoogleAd from '../components/common/GoogleAd';

const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser, updateUser } = useAuth();
    const navigate = useNavigate();

    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [avatar, setAvatar] = useState<AvatarType | null>(null);
    const [stats, setStats] = useState<SeasonTotal | null>(null);
    const [loading, setLoading] = useState(true);
    const [canPoke, setCanPoke] = useState(false);
    const [pokeCooldown, setPokeCooldown] = useState(false);
    const [gpScores, setGpScores] = useState<GpScore[]>([]);
    const [showAllResults, setShowAllResults] = useState(false);


    const isOwnProfile = currentUser?.id === userId;

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                navigate('/');
                return;
            }
            setLoading(true);
            try {
                const [userToView, seasonTotals, allOfficialResults, userPredictions] = await Promise.all([
                    db.getUserById(userId),
                    db.calculateSeasonTotals(),
                    db.getOfficialResults(),
                    db.getPredictionsForUser(userId),
                ]);

                if (userToView) {
                    setProfileUser(userToView);
                    setUsername(userToView.username);
                    setAvatar({
                        skinColor: '#C68642', color: '#6CD3BF', secondaryColor: '#FFFFFF',
                        eyes: 'normal', pattern: 'none', ...userToView.avatar,
                    });
                    
                    const userStats = seasonTotals.find(s => s.userId === userToView.id);
                    setStats(userStats || null);
                    
                    if (allOfficialResults.length > 0) {
                        const scores: GpScore[] = [];
                        for (const result of allOfficialResults) {
                            const prediction = userPredictions.find(p => p.gpId === result.gpId);
                            // FIX: Add defensive check to ensure the prediction belongs to the current profile user.
                            // This prevents a rare data consistency issue where a new user might see another's predictions.
                            if (prediction && prediction.userId === userId) {
                                const score = await db.calculateGpScore(prediction, result);
                                scores.push(score);
                            } else {
                                const gp = (await db.getSchedule()).find(g => g.id === result.gpId);
                                scores.push({
                                    gpId: result.gpId,
                                    gpName: gp?.name || `GP ${result.gpId}`,
                                    totalPoints: 0,
                                    breakdown: { pole: 0, sprintPole: 0, sprintPodium: 0, racePodium: 0, fastestLap: 0, driverOfTheDay: 0 }
                                });
                            }
                        }
                        setGpScores(scores.sort((a, b) => b.gpId - a.gpId));
                    }

                } else {
                    setProfileUser(null);
                }
            } catch (error) {
                console.error("Error fetching profile data:", error);
                setProfileUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, navigate]);

    useEffect(() => {
        const checkPokeStatus = async () => {
            if (currentUser && userId && !isOwnProfile) {
                const existingPoke = await db.getExistingUnseenPoke(currentUser.id, userId);
                setCanPoke(!existingPoke);
                setPokeCooldown(!!existingPoke);
            } else {
                setCanPoke(false);
                setPokeCooldown(false);
            }
        };
        
        checkPokeStatus();
        const interval = setInterval(checkPokeStatus, 5000); // Poll for poke status changes
        return () => clearInterval(interval);

    }, [currentUser, userId, isOwnProfile]);

    const handlePoke = async () => {
        if (!canPoke || !currentUser || !userId) return;
        
        setCanPoke(false);
        try {
            await db.addPoke(currentUser.id, userId);
            setPokeCooldown(true);
        } catch (error) {
            console.error("Error sending poke:", error);
            alert("No se pudo enviar el toque. Inténtalo de nuevo.");
            setCanPoke(true);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwnProfile || !currentUser || !avatar) return;

        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setUsernameError('El nombre de usuario no puede estar vacío.');
            return;
        }
        if (/\s/.test(trimmedUsername)) {
            setUsernameError('El nombre de usuario no puede contener espacios.');
            return;
        }
        if (trimmedUsername.length < 3) {
            setUsernameError('El nombre de usuario debe tener al menos 3 caracteres.');
            return;
        }
        setUsernameError('');

        if (trimmedUsername !== currentUser.username) {
            const existingUser = await db.getUserByUsername(trimmedUsername);
            if (existingUser && existingUser.id !== currentUser.id) {
                setUsernameError('Este nombre de usuario ya está en uso.');
                return;
            }
        }
        
        const updatedUser = {
            ...currentUser,
            username: trimmedUsername,
            avatar: avatar
        };
        await updateUser(updatedUser);
        setProfileUser(updatedUser);
        setIsEditing(false);
        alert('Perfil actualizado con éxito.');
    };

    const handleEditClick = () => {
        if (!isOwnProfile) return;
        setIsEditing(true);
    };
    
    if (loading) {
        return <div className="text-center p-8">Cargando perfil...</div>;
    }

    if (!profileUser) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-7xl text-center">
                <h1 className="text-3xl font-bold mb-8">Usuario no encontrado</h1>
                <p className="text-[var(--text-secondary)]">El perfil que buscas no existe o no está disponible.</p>
            </div>
        );
    }
    
    const resultsToShow = showAllResults ? gpScores : gpScores.slice(0, 3);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-8">
                     <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                       {isEditing && avatar ? (
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <h1 className="text-3xl font-bold mb-4 sm:mb-0">Editando Perfil</h1>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto self-end">
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2.5 px-6 rounded-md transition-colors">Cancelar</button>
                                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-md transition-colors">Guardar</button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre de usuario</label>
                                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full max-w-md bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-red)]" />
                                {usernameError && <p className="text-sm text-red-400 mt-2">{usernameError}</p>}
                            </div>
                            
                            <AvatarEditor avatar={avatar} onAvatarChange={setAvatar} />

                        </form>
                       ) : (
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
                           {avatar && <Avatar avatar={avatar} className="w-40 h-40" />}
                           <div className="flex-grow text-center sm:text-left">
                               <h2 className="text-4xl font-bold">{profileUser.username}</h2>
                               <p className="text-[var(--text-secondary)]">Miembro desde {new Date(profileUser.createdAt).toLocaleDateString()}</p>
                           </div>
                           {isOwnProfile && (
                               <button onClick={handleEditClick} className="w-full sm:w-auto bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-2.5 px-6 rounded-md transition-opacity">
                                    Editar Perfil
                                </button>
                           )}
                        </div>
                       )}
                    </div>
                    <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                        <h2 className="text-2xl font-bold f1-red-text mb-4">Resultados de la Temporada</h2>
                        {gpScores.length > 0 ? (
                            <>
                                <div className="space-y-4">
                                    {resultsToShow.map(score => (
                                        <div key={score.gpId} className="bg-[var(--background-light)] p-4 rounded-lg flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <p className="font-bold text-lg text-white">{score.gpName}</p>
                                                <p className="text-sm text-gray-400">Puntos Obtenidos: <span className="font-bold text-[var(--accent-blue)]">{score.totalPoints}</span></p>
                                            </div>
                                            <Link 
                                                to={`/results/${profileUser.id}/${score.gpId}`}
                                                className="bg-[var(--accent-blue)] text-black font-bold py-2 px-4 rounded-md hover:opacity-80 transition-opacity text-sm"
                                            >
                                                Ver Desglose
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                                {gpScores.length > 3 && (
                                    <div className="mt-6 text-center">
                                        <button
                                            onClick={() => setShowAllResults(!showAllResults)}
                                            className="text-[var(--accent-blue)] font-semibold hover:opacity-80 transition-opacity py-2 px-5 rounded-md flex items-center justify-center mx-auto space-x-2 bg-[var(--background-light)] hover:bg-[var(--border-color)]"
                                        >
                                            <span>{showAllResults ? 'Mostrar menos' : 'Ver todos'}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showAllResults ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-[var(--text-secondary)]">No hay resultados de Grandes Premios para mostrar todavía.</p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] self-start">
                    <h2 className="text-2xl font-bold f1-red-text mb-4">Estadísticas</h2>
                     {stats ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline p-3 bg-[var(--background-light)] rounded-lg">
                                <span className="text-[var(--text-secondary)]">Puntos Totales:</span>
                                <span className="text-2xl font-bold text-[var(--accent-blue)]">{stats.totalPoints}</span>
                            </div>
                            <div className="flex justify-between items-baseline p-3">
                                <span className="text-[var(--text-secondary)]">Victorias (P1) exactas:</span>
                                <span className="text-lg font-mono">{stats.details.exactP1}</span>
                            </div>
                            <div className="flex justify-between items-baseline p-3">
                                <span className="text-[var(--text-secondary)]">Poles exactas:</span>
                                <span className="text-lg font-mono">{stats.details.exactPole}</span>
                            </div>
                             <div className="flex justify-between items-baseline p-3">
                                <span className="text-[var(--text-secondary)]">Vueltas Rápidas exactas:</span>
                                <span className="text-lg font-mono">{stats.details.exactFastestLap}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[var(--text-secondary)]">Aún no hay estadísticas disponibles para esta temporada.</p>
                    )}

                    {!isOwnProfile && currentUser && (
                        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                          <button
                            onClick={handlePoke}
                            disabled={!canPoke}
                            className="w-full bg-[var(--accent-blue)] text-black font-bold py-3 px-6 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-80 flex items-center justify-center space-x-2 transform hover:scale-105"
                          >
                            {pokeCooldown ? (
                                <span>Toque Enviado ✓</span>
                            ) : (
                              <>
                                <span>Dar un Toque</span>
                                <span className="inline-block text-xl group-hover:animate-wave">👋</span>
                              </>
                            )}
                          </button>
                           {pokeCooldown && <p className="text-center text-xs text-[var(--text-secondary)] mt-2">Podrás volver a darle un toque cuando vea la notificación.</p>}
                        </div>
                    )}
                </div>
            </div>
             {/* AdSense Block */}
            <div className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center mb-4">Publicidad</h2>
                <GoogleAd slot="4912304848" />
            </div>
        </div>
    );
};

export default ProfilePage;