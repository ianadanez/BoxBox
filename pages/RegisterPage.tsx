
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import { Avatar as AvatarType, Team } from '../types';
import AvatarEditor from '../components/common/AvatarEditor';
import { db } from '../services/db';

const getRandomAvatar = (): AvatarType => ({
    skinColor: '#C68642',
    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    secondaryColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    eyes: ['normal', 'wink', 'laser', 'chequered', 'drs', 'pitstop', 'determined', 'star', 'goggles'][Math.floor(Math.random() * 9)] as AvatarType['eyes'],
    pattern: ['none', 'stripes', 'halftone', 'checkers', 'flames', 'carbon'][Math.floor(Math.random() * 6)] as AvatarType['pattern'],
});


const RegisterPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [favoriteTeamId, setFavoriteTeamId] = useState('');
    const [avatar, setAvatar] = useState<AvatarType>(getRandomAvatar());
    const [teams, setTeams] = useState<Team[]>([]);
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTeams = async () => {
            const teamsData = await db.getTeams();
            setTeams(teamsData);
            if (teamsData.length > 0) {
                setFavoriteTeamId(teamsData[0].id);
            }
        };
        fetchTeams();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!name || !email || !password || !favoriteTeamId) {
            setError("Todos los campos son requeridos.");
            return;
        }

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        
        setLoading(true);

        try {
            await register({ name, email, password, favoriteTeamId, avatar });
            setIsSuccess(true);
        } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Este email ya está registrado. Intenta iniciar sesión.');
            } else {
                setError('Ocurrió un error inesperado durante el registro.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    if (isSuccess) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-[var(--background-dark)] p-4">
                <div className="w-full max-w-2xl p-8 space-y-6 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] text-center">
                    <h1 className="text-3xl font-bold text-green-400">¡Registro Exitoso!</h1>
                    <p className="text-lg text-[var(--text-primary)]">Hemos enviado un correo de verificación a <strong>{email}</strong>.</p>
                    <p className="text-[var(--text-secondary)]">Por favor, haz clic en el enlace de ese correo para activar tu cuenta antes de iniciar sesión.</p>
                    <div className="pt-4">
                         <Link to="/login" className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-[var(--accent-red)] hover:opacity-90">
                            Ir a Iniciar Sesión
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--background-dark)] p-4">
            <div className="w-full max-w-2xl p-8 space-y-6 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)]">
                <h1 className="text-3xl font-bold text-center f1-red-text">Crear Cuenta en {APP_NAME}</h1>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)]">Nombre</label>
                            <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">Contraseña</label>
                            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Debe tener al menos 6 caracteres.</p>
                        </div>
                         <div>
                            <label htmlFor="favoriteTeamId" className="block text-sm font-medium text-[var(--text-secondary)]">Escudería Favorita</label>
                            <select id="favoriteTeamId" value={favoriteTeamId} onChange={(e) => setFavoriteTeamId(e.target.value)} required
                                className="mt-1 w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]">
                                {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="border-t border-[var(--border-color)] pt-6">
                         <AvatarEditor avatar={avatar} onAvatarChange={setAvatar} />
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div>
                        <button type="submit" disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-[var(--accent-red)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-medium)] focus:ring-[var(--accent-red)] disabled:opacity-50 transition-opacity">
                            {loading ? 'Creando cuenta...' : 'Finalizar Registro'}
                        </button>
                    </div>
                     <div className="text-center">
                        <Link to="/login" className="text-sm text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                            ¿Ya tienes cuenta? Inicia sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
