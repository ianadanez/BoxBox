
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { User } from '../types';
import Avatar from '../components/common/Avatar';
import GoogleAd from '../components/common/GoogleAd';
import { useAuth } from '../contexts/AuthContext';

const SearchPage: React.FC = () => {
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setFilteredUsers([]);
            return;
        }
        const trimmed = query.trim();
        if (!trimmed) {
            setFilteredUsers([]);
            return;
        }
        setLoading(true);
        const handle = setTimeout(async () => {
            try {
                const results = await db.searchUsersByUsername(trimmed);
                setFilteredUsers(results);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(handle);
    }, [query, user]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Buscar Usuarios</h1>
            <div className="mb-8">
                <input
                    type="text"
                    placeholder="Escribe un nombre de usuario para buscar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-3 text-lg text-white placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)] transition-colors"
                />
            </div>

            {!user ? (
                <p className="text-center text-[var(--text-secondary)]">Iniciá sesión para buscar usuarios.</p>
            ) : loading ? (
                <p className="text-center text-[var(--text-secondary)]">Buscando usuarios...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <Link 
                                key={user.id} 
                                to={`/profile/${user.id}`} 
                                className="bg-[var(--background-medium)] p-4 rounded-lg border border-[var(--border-color)] flex flex-col items-center text-center space-y-3 hover:border-[var(--accent-red)] hover:shadow-lg hover:shadow-red-900/20 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <Avatar avatar={user.avatar} className="w-24 h-24" />
                                <span className="font-bold text-lg text-[var(--text-primary)]">{user.username}</span>
                            </Link>
                        ))
                    ) : (
                        <p className="col-span-full text-center text-[var(--text-secondary)] py-8">
                            {query.trim() ? 'No se encontraron usuarios con ese nombre.' : 'Escribí para buscar usuarios.'}
                        </p>
                    )}
                </div>
            )}

            {/* AdSense Block */}
            <div className="mt-12">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center mb-4">Publicidad</h2>
                <GoogleAd slot="9191009943" />
            </div>
        </div>
    );
};

export default SearchPage;
