

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar as AvatarType, SeasonTotal, User } from '../types';
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
    const [displayName, setDisplayName] = useState('');
    const [avatar, setAvatar] = useState<AvatarType | null>(null);
    const [stats, setStats] = useState<SeasonTotal | null>(null);
    const [loading, setLoading] = useState(true);
    const [canPoke, setCanPoke] = useState(false);
    const [pokeCooldown, setPokeCooldown] = useState(false);
    const [hasAnyResults, setHasAnyResults] = useState(false);

    const isOwnProfile = currentUser?.id === userId;

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                navigate('/');
                return;
            }
            setLoading(true);
            try {
                const [userToView, seasonTotals, officialResults] = await Promise.all([
                    db.getUserById(userId),
                    db.calculateSeasonTotals(),
                    db.getOfficialResults(),
                ]);

                if (userToView) {
                    setProfileUser(userToView);
                    setDisplayName(userToView.name);
                    setAvatar({
                        skinColor: '#C68642', color: '#6CD3BF', secondaryColor: '#FFFFFF',
                        eyes: 'normal', pattern: 'none', ...userToView.avatar,
                    });
                    
                    const userStats = seasonTotals.find(s => s.userId === userToView.id);
                    setStats(userStats || null);
                    setHasAnyResults(officialResults.length > 0);
                    
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
        
        const updatedUser = {
            ...currentUser,
            name: displayName,
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
                                <label htmlFor="displayName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Nombre visible</label>
                                <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full max-w-md bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-red)]" />
                            </div>
                            
                            <AvatarEditor avatar={avatar} onAvatarChange={setAvatar} />

                        </form>
                       ) : (
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
                           {avatar && <Avatar avatar={avatar} className="w-40 h-40" />}
                           <div className="flex-grow text-center sm:text-left">
                               <h2 className="text-4xl font-bold">{profileUser.name}</h2>
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

                    {hasAnyResults && profileUser && (
                        <div className="mt-6">
                            <Link
                                to={`/results/${profileUser.id}`}
                                className="w-full block text-center bg-[var(--accent-blue)] text-black font-bold py-3 px-6 rounded-md transition-all hover:bg-opacity-80 transform hover:scale-105"
                            >
                                Ver Resultados del Último GP
                            </Link>
                        </div>
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
