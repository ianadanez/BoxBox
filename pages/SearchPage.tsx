
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { User } from '../types';
import Avatar from '../components/common/Avatar';

const SearchPage: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const users = await db.getUsers();
            setAllUsers(users);
            setFilteredUsers(users); // Show all users initially
            setLoading(false);
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (query.trim() === '') {
            setFilteredUsers(allUsers);
        } else {
            const lowercasedQuery = query.toLowerCase();
            const results = allUsers.filter(user =>
                user.name.toLowerCase().includes(lowercasedQuery)
            );
            setFilteredUsers(results);
        }
    }, [query, allUsers]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Buscar Usuarios</h1>
            <div className="mb-8">
                <input
                    type="text"
                    placeholder="Escribe un nombre para buscar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-3 text-lg text-white placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)] transition-colors"
                />
            </div>

            {loading ? (
                <p className="text-center text-[var(--text-secondary)]">Cargando usuarios...</p>
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
                                <span className="font-bold text-lg text-[var(--text-primary)]">{user.name}</span>
                            </Link>
                        ))
                    ) : (
                        <p className="col-span-full text-center text-[var(--text-secondary)] py-8">No se encontraron usuarios con ese nombre.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
