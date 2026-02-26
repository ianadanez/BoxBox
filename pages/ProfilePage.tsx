

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Avatar as AvatarType, GpScore, User, SeasonTotal, Team, Season, Driver } from '../types';
import Avatar from '../components/common/Avatar';
import AvatarEditor from '../components/common/AvatarEditor';
import { db } from '../services/db';
import GoogleAd from '../components/common/GoogleAd';
import { getActiveSeason, listenToActiveSeason } from '../services/seasonService';
import { engine } from '../services/engine';
import { appendFavoriteTeamAssignment, normalizeFavoriteTeamHistory } from '../services/favoriteTeamHistory';
import { COUNTRY_OPTIONS, countryCodeToFlagEmoji, getCountryNameByCode } from '../services/countries';
import { reportClientError } from '../services/monitoring';

const normalizeTeamColor = (value?: string) => {
    if (!value) return null;
    if (value.startsWith('bg-[') && value.endsWith(']')) {
        return value.slice(4, -1);
    }
    return value.startsWith('#') || value.startsWith('rgb') ? value : null;
};

type Rgb = { r: number; g: number; b: number };

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const parseColor = (value?: string | null): Rgb | null => {
    const normalized = normalizeTeamColor(value || undefined);
    if (!normalized) return null;

    if (normalized.startsWith('#')) {
        const hex = normalized.slice(1);
        if (hex.length === 3) {
            return {
                r: parseInt(`${hex[0]}${hex[0]}`, 16),
                g: parseInt(`${hex[1]}${hex[1]}`, 16),
                b: parseInt(`${hex[2]}${hex[2]}`, 16),
            };
        }
        if (hex.length === 6) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
            };
        }
        return null;
    }

    const rgbMatch = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (!rgbMatch) return null;
    return {
        r: clamp(Number(rgbMatch[1])),
        g: clamp(Number(rgbMatch[2])),
        b: clamp(Number(rgbMatch[3])),
    };
};

const mixWithWhite = (color: Rgb, amount: number): Rgb => ({
    r: color.r + (255 - color.r) * amount,
    g: color.g + (255 - color.g) * amount,
    b: color.b + (255 - color.b) * amount,
});

const luminance = ({ r, g, b }: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const rgba = ({ r, g, b }: Rgb, alpha: number) => `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${alpha})`;
const hex = ({ r, g, b }: Rgb) =>
    `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;

const getTeamChipPalette = (value?: string | null) => {
    const base = parseColor(value);
    if (!base) return null;
    const baseLum = luminance(base);
    const brightenAmount = baseLum < 0.2 ? 0.62 : baseLum < 0.4 ? 0.45 : 0.28;
    const accent = mixWithWhite(base, brightenAmount);
    return {
        accent: hex(accent),
        border: rgba(accent, 0.75),
        background: rgba(base, 0.24),
        glow: rgba(accent, 0.45),
    };
};

const ProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser, updateUser } = useAuth();
    const navigate = useNavigate();

    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [avatar, setAvatar] = useState<AvatarType | null>(null);
    const [stats, setStats] = useState<SeasonTotal | null>(null);
    const [loading, setLoading] = useState(true);
    const [canPoke, setCanPoke] = useState(false);
    const [pokeCooldown, setPokeCooldown] = useState(false);
    const [gpScores, setGpScores] = useState<GpScore[]>([]);
    const [showAllResults, setShowAllResults] = useState(false);
    const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedFavoriteTeamId, setSelectedFavoriteTeamId] = useState<string>('');
    const [showFavoritePrompt, setShowFavoritePrompt] = useState(false);
    const [copying, setCopying] = useState(false);


    const isOwnProfile = currentUser?.id === userId;

    // Carga perfil y datos de temporada seleccionada
    useEffect(() => {
        const fetchProfileData = async () => {
            if (!userId) {
                navigate('/');
                return;
            }
            setLoading(true);
            try {
                const [userToView, seasonList, activeSeason] = await Promise.all([
                    db.getUserById(userId),
                    db.listSeasons().catch(() => [] as Season[]),
                    getActiveSeason(),
                ]);

                if (!userToView) {
                    navigate('/');
                    return;
                }

                setProfileUser(userToView);
                setUsername(userToView.username);
                setCountryCode((userToView.countryCode || '').toUpperCase());
                setAvatar({
                    skinColor: '#C68642', color: '#6CD3BF', secondaryColor: '#FFFFFF',
                    eyes: 'normal', pattern: 'none', ...userToView.avatar,
                });

                setSeasons(seasonList);
                const seasonToUse = selectedSeasonId || activeSeason || seasonList[seasonList.length - 1]?.id || null;
                if (!selectedSeasonId) setSelectedSeasonId(seasonToUse);

                if (!seasonToUse) {
                    setStats(null);
                    setGpScores([]);
                    setTeams([]);
                    setDrivers([]);
                    return;
                }

                const [
                    seasonTotals,
                    officialResults,
                    userPredictions,
                    seasonSchedule,
                    seasonDrivers,
                    seasonTeams,
                ] = await Promise.all([
                    db.calculateSeasonTotalsForSeason(seasonToUse),
                    db.getOfficialResultsForSeason(seasonToUse),
                    db.getPredictionsForUserInSeason(seasonToUse, userId),
                    db.getScheduleForSeason(seasonToUse),
                    db.getDriversForSeason(seasonToUse),
                    db.getTeamsForSeason(seasonToUse),
                ]);

                const userStats = seasonTotals.find((s) => s.userId === userToView.id);
                setStats(userStats || null);
                setTeams(seasonTeams);
                setDrivers(seasonDrivers);

                if (officialResults.length > 0) {
                    const scores: GpScore[] = [];
                    for (const result of officialResults) {
                        const prediction = userPredictions.find((p) => p.gpId === result.gpId);
                        const gp = seasonSchedule.find((g) => g.id === result.gpId);
                        if (prediction && gp) {
                            const score = await engine.calculateGpScore(gp, prediction, result);
                            scores.push(score);
                        } else if (gp) {
                            scores.push({
                                gpId: result.gpId,
                                gpName: gp.name,
                                totalPoints: 0,
                                breakdown: { pole: 0, sprintPole: 0, sprintPodium: 0, racePodium: 0, fastestLap: 0, driverOfTheDay: 0 },
                            });
                        }
                    }
                    setGpScores(scores.sort((a, b) => b.gpId - a.gpId));
                } else {
                    setGpScores([]);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
                setProfileUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, navigate, selectedSeasonId]);

    // Escucha la temporada activa y la deja en estado (para favorito)
    useEffect(() => {
        const bootstrap = async () => {
            const initial = await getActiveSeason();
            setActiveSeasonId(initial);
        };
        bootstrap();
        const unsub = listenToActiveSeason((id) => setActiveSeasonId(id));
        return () => { if (unsub) unsub(); };
    }, []);

    // Determina si hay que pedir favorito para la temporada activa
    useEffect(() => {
        const loadSeasonFavorite = async () => {
            if (!isOwnProfile || !profileUser || !activeSeasonId) {
                setShowFavoritePrompt(false);
                return;
            }
            const seasonTeams = await db.getTeams();
            setTeams(seasonTeams);
            const existingFavorite = profileUser.favoriteTeamId;
            const validExisting = existingFavorite && seasonTeams.some(t => t.id === existingFavorite);
            setSelectedFavoriteTeamId(validExisting ? existingFavorite : (seasonTeams[0]?.id || ''));
            const needsConfirmation = profileUser.favoriteTeamSeason !== activeSeasonId;
            setShowFavoritePrompt(needsConfirmation);
        };
        loadSeasonFavorite();
    }, [isOwnProfile, profileUser, activeSeasonId]);

    // Carga equipos también para perfiles ajenos (mostrar nombre/color)
    useEffect(() => {
        const loadTeams = async () => {
            if (!selectedSeasonId) return;
            const seasonTeams = await db.getTeamsForSeason(selectedSeasonId);
            setTeams(seasonTeams);
        };
        loadTeams();
    }, [selectedSeasonId]);

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

        const normalizedCurrent = currentUser.username.trim().toLowerCase();
        const normalizedNext = trimmedUsername.toLowerCase();

        if (normalizedNext !== normalizedCurrent) {
            try {
                await db.reserveUsername(trimmedUsername, currentUser.id);
            } catch (err: any) {
                if (err?.name === 'auth/username-already-in-use') {
                    setUsernameError('Este nombre de usuario ya está en uso.');
                } else {
                    setUsernameError('No se pudo reservar el nombre de usuario.');
                }
                return;
            }
        }
        
        const updatedUser = {
            ...currentUser,
            username: trimmedUsername,
            avatar: avatar,
            countryCode: countryCode ? countryCode.toUpperCase() : "",
            favoriteTeamId: selectedFavoriteTeamId || currentUser.favoriteTeamId,
            favoriteTeamSeason: activeSeasonId || currentUser.favoriteTeamSeason,
            favoriteTeamHistory:
                selectedFavoriteTeamId && selectedFavoriteTeamId !== currentUser.favoriteTeamId
                    ? appendFavoriteTeamAssignment(currentUser, selectedFavoriteTeamId)
                    : normalizeFavoriteTeamHistory(currentUser),
        };
        try {
            await updateUser(updatedUser);
            setProfileUser(updatedUser);
            setIsEditing(false);
            alert('Perfil actualizado con éxito.');
            if (normalizedNext !== normalizedCurrent) {
                await db.releaseUsername(currentUser.username, currentUser.id);
            }
        } catch (err) {
            void reportClientError("profile.save", err, {
                userId: currentUser.id,
                editingOwnProfile: isOwnProfile,
            });
            if (normalizedNext !== normalizedCurrent) {
                await db.releaseUsername(trimmedUsername, currentUser.id).catch(() => {});
            }
            alert('No se pudo guardar el perfil. Intenta nuevamente.');
        }
    };

    const handleEditClick = () => {
        if (!isOwnProfile) return;
        setIsEditing(true);
    };

    const handleCopyLink = async () => {
        if (!profileUser) return;
        try {
            setCopying(true);
            await navigator.clipboard.writeText(window.location.href);
        } catch (err) {
            console.error('No se pudo copiar el enlace', err);
        } finally {
            setTimeout(() => setCopying(false), 1200);
        }
    };

    const handleSaveFavoriteTeam = async () => {
        if (!isOwnProfile || !currentUser || !activeSeasonId || !selectedFavoriteTeamId) return;
        const updatedUser = {
            ...currentUser,
            favoriteTeamId: selectedFavoriteTeamId,
            favoriteTeamSeason: activeSeasonId,
            favoriteTeamHistory: appendFavoriteTeamAssignment(currentUser, selectedFavoriteTeamId),
        };
        await updateUser(updatedUser);
        setProfileUser(updatedUser);
        setShowFavoritePrompt(false);
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
    const favoriteTeam = teams.find((team) => team.id === profileUser.favoriteTeamId);
    const countryFlag = countryCodeToFlagEmoji(profileUser.countryCode);
    const countryName = getCountryNameByCode(profileUser.countryCode);
    const favoriteTeamColor = normalizeTeamColor(favoriteTeam?.color);
    const favoriteTeamPalette = getTeamChipPalette(favoriteTeamColor);
    const favoriteChipStyle = favoriteTeamPalette
        ? {
              borderColor: favoriteTeamPalette.border,
              backgroundColor: favoriteTeamPalette.background,
              boxShadow: `0 0 14px ${favoriteTeamPalette.glow}`,
          }
        : undefined;
    const favoriteChipTextStyle = favoriteTeamPalette ? { color: favoriteTeamPalette.accent } : undefined;
    const favoriteDotStyle = favoriteTeamPalette ? { backgroundColor: favoriteTeamPalette.accent } : undefined;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-8">
                     {isOwnProfile && showFavoritePrompt && (
                        <div className="bg-[var(--background-medium)] p-4 sm:p-5 rounded-lg border border-[var(--border-color)] shadow-lg shadow-black/30">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">Temporada {activeSeasonId || 'actual'}</p>
                                    <h3 className="text-lg font-bold">Elegí tu escudería favorita para esta temporada</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Se renueva cada año; confirmala acá.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <select
                                        value={selectedFavoriteTeamId}
                                        onChange={(e) => setSelectedFavoriteTeamId(e.target.value)}
                                        className="w-full sm:w-52 px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]"
                                    >
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleSaveFavoriteTeam}
                                        className="px-4 py-2 rounded-md bg-[var(--accent-red)] text-white font-bold hover:opacity-90 transition-colors"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                     )}
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
                            <div>
                                <label htmlFor="countryCode" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">País</label>
                                <select
                                    id="countryCode"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-full max-w-md bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-red)]"
                                >
                                    <option value="">Prefiero no decirlo</option>
                                    {COUNTRY_OPTIONS.map((country) => (
                                        <option key={country.code} value={country.code}>
                                            {countryCodeToFlagEmoji(country.code)} {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="favoriteTeam" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Escudería favorita (temporada {activeSeasonId || 'actual'})</label>
                                <select
                                    id="favoriteTeam"
                                    value={selectedFavoriteTeamId}
                                    onChange={(e) => setSelectedFavoriteTeamId(e.target.value)}
                                    className="w-full max-w-md bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2.5 text-white focus:ring-2 focus:ring-[var(--accent-red)]"
                                >
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <AvatarEditor avatar={avatar} onAvatarChange={setAvatar} />

                        </form>
                       ) : (
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
                           {avatar && <Avatar avatar={avatar} className="w-40 h-40" />}
                           <div className="flex-grow text-center sm:text-left">
                               <div className="flex items-center justify-center sm:justify-start gap-2">
                                   <h2 className="text-4xl font-bold">{profileUser.username}</h2>
                                   {countryFlag && <span className="text-3xl leading-none">{countryFlag}</span>}
                               </div>
                                <p className="text-[var(--text-secondary)]">Miembro desde {new Date(profileUser.createdAt).toLocaleDateString()}</p>
                                {countryName && <p className="text-[var(--text-secondary)]">{countryName}</p>}
                                {favoriteTeam && (
                                    <div
                                        className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-[rgba(225,29,72,0.15)] border-[rgba(225,29,72,0.35)]"
                                        style={favoriteChipStyle}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full bg-[#fda4af]"
                                            style={favoriteDotStyle}
                                        />
                                        <span
                                            className="text-xs font-bold text-[#fda4af]"
                                            style={favoriteChipTextStyle}
                                        >
                                            {favoriteTeam.name}
                                        </span>
                                    </div>
                                )}
                                {isOwnProfile && (
                                    <button
                                        onClick={handleCopyLink}
                                        className="mt-3 inline-flex items-center space-x-2 text-sm text-[var(--accent-blue)] hover:opacity-80"
                                        aria-label="Copiar enlace del perfil"
                                    >
                                        <span>{copying ? 'Copiado' : 'Copiar enlace del perfil'}</span>
                                    </button>
                                )}
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <h2 className="text-2xl font-bold f1-red-text">Resultados de la Temporada {selectedSeasonId || activeSeasonId || ''}</h2>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-[var(--text-secondary)]">Temporada</label>
                                <select
                                    className="bg-[var(--background-light)] border border-[var(--border-color)] text-white rounded-md px-3 py-2"
                                    value={selectedSeasonId || ''}
                                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                                >
                                    {seasons.map(s => (
                                        <option key={s.id} value={s.id}>{s.name || s.id}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {gpScores.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {resultsToShow.map(score => (
                                        <div
                                            key={score.gpId}
                                            className="relative overflow-hidden rounded-xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--background-light)] to-[var(--background-medium)] p-4 shadow-lg shadow-black/30"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs text-[var(--text-secondary)]">GP #{score.gpId}</p>
                                                    <p className="text-lg font-bold text-white">{score.gpName}</p>
                                                    <div className="flex items-baseline gap-2 mt-2">
                                                        <span className="text-2xl font-black text-[var(--accent-blue)]">{score.totalPoints}</span>
                                                        <span className="text-xs text-[var(--text-secondary)]">pts</span>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/results/${profileUser.id}/${score.gpId}?season=${selectedSeasonId || ''}`}
                                                    className="text-xs font-semibold text-[var(--accent-blue)] bg-white/10 px-3 py-1 rounded-md border border-[var(--border-color)] hover:bg-white/15 transition-colors"
                                                    aria-label={`Ver desglose de ${score.gpName}`}
                                                >
                                                    Ver desglose
                                                </Link>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-[var(--text-secondary)]">
                                                <span className="px-2 py-1 rounded-full bg-white/5 border border-[var(--border-color)]">Pole {score.breakdown.pole}</span>
                                                <span className="px-2 py-1 rounded-full bg-white/5 border border-[var(--border-color)]">Sprint {score.breakdown.sprintPodium + score.breakdown.sprintPole}</span>
                                                <span className="px-2 py-1 rounded-full bg-white/5 border border-[var(--border-color)]">Carrera {score.breakdown.racePodium}</span>
                                                <span className="px-2 py-1 rounded-full bg-white/5 border border-[var(--border-color)]">VR {score.breakdown.fastestLap}</span>
                                            </div>
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
                    <h2 className="text-2xl font-bold f1-red-text mb-1">Estadísticas</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">Temporada {selectedSeasonId || activeSeasonId || 'actual'}</p>
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
