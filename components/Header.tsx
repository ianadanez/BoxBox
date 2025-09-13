

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './common/Avatar';
import { User, Notification } from '../types';
import { db } from '../services/db';

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const BellIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const MenuIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const AppLogo: React.FC = () => (
    <img src="https://i.imgur.com/VfzbTsC.png" alt="BoxBox Logo" className="h-10 w-auto" />
);


interface NotificationDropdownProps {
    notifications: Notification[];
    users: User[];
    onAccept: (notifId: string, tournamentId: string) => void;
    onDecline: (notifId: string, tournamentId: string) => void;
    onClose: () => void;
    currentUser: User;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ notifications, users, onAccept, onDecline, onClose, currentUser }) => {
    
    const getUser = (id: string): User | undefined => users.find(u => u.id === id);

    const renderNotificationContent = (n: Notification) => {
        const fromUser = getUser('fromUserId' in n ? n.fromUserId : '');
        
        const getNotificationDetails = (): { emoji: string; content: React.ReactNode } => {
            switch (n.type) {
                case 'poke':
                    return { emoji: '👋', content: <><span className="font-bold">{fromUser?.username || 'Alguien'}</span> te ha dado un toque.</> };
                case 'results':
                    const sessionName = { quali: 'la Clasificación', sprint: 'el Sprint', race: 'la Carrera' }[n.session] || 'una sesión';
                    return { emoji: '🏁', content: <>Ya están los resultados de <span className="font-semibold">{sessionName}</span> del <span className="font-bold">{n.gpName}</span>.</> };
                case 'points_adjustment':
                    const admin = getUser(n.adminId);
                    const verb = n.points > 0 ? 'añadido' : 'quitado';
                    return { emoji: '📊', content: <><span className="font-bold">{admin?.username || 'Un admin'}</span> te ha {verb} <span className="font-bold">{Math.abs(n.points)}</span> puntos. Motivo: {n.reason}</> };
                case 'tournament_invite':
                    return {
                        emoji: '🏆',
                        content: (
                            <div>
                                <p><span className="font-bold">{fromUser?.username || 'Alguien'}</span> te ha invitado al torneo <span className="font-bold">{n.tournamentName}</span>.</p>
                                <div className="flex space-x-2 mt-2">
                                    <button onClick={(e) => { e.stopPropagation(); onAccept(n.id, n.tournamentId); }} className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md">Aceptar</button>
                                    <button onClick={(e) => { e.stopPropagation(); onDecline(n.id, n.tournamentId); }} className="text-xs bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md">Rechazar</button>
                                </div>
                            </div>
                        )
                    };
                case 'tournament_invite_accepted':
                     return { emoji: '✅', content: <><span className="font-bold">{fromUser?.username || 'Alguien'}</span> ha aceptado tu invitación a <span className="font-bold">{n.tournamentName}</span>.</> };
                case 'tournament_invite_declined':
                    return { emoji: '❌', content: <><span className="font-bold">{fromUser?.username || 'Alguien'}</span> ha rechazado tu invitación a <span className="font-bold">{n.tournamentName}</span>.</> };
                default:
                    return { emoji: '🔔', content: <>Tienes una nueva notificación.</> };
            }
        };

        const { emoji, content } = getNotificationDetails();
        
        return (
            <div className="flex items-start space-x-3">
                <span className="text-xl mt-0.5">{emoji}</span>
                <div className="flex-1">{content}</div>
            </div>
        );
    };
    
    const getLinkForNotification = (n: Notification): string | null => {
        if (!currentUser) return null;
        switch (n.type) {
            case 'poke':
                return `/profile/${n.fromUserId}`;
            case 'results':
                return `/results/${currentUser.id}/${n.gpId}`;
            case 'points_adjustment':
                return `/profile/${currentUser.id}`;
            case 'tournament_invite_accepted':
            case 'tournament_invite_declined':
                 return `/tournaments`;
            default:
                return null;
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] overflow-hidden z-20">
            <div className="p-3 border-b border-[var(--border-color)]">
                <h3 className="font-bold text-[var(--text-primary)]">Notificaciones</h3>
            </div>
            {notifications.length > 0 ? (
                <ul className="max-h-96 overflow-y-auto">
                    {notifications.map(n => {
                        const link = getLinkForNotification(n);
                        const content = (
                            <>
                                {renderNotificationContent(n)}
                                <p className="text-xs text-gray-500 mt-1 text-right">{new Date(n.timestamp).toLocaleString()}</p>
                            </>
                        );

                        if (link) {
                            return (
                                <li key={n.id} className={`border-b border-[var(--border-color)] ${!n.seen ? 'bg-blue-900/20' : ''}`}>
                                    <Link to={link} onClick={onClose} className="block p-3 text-sm hover:bg-[var(--background-light)] transition-colors">
                                        {content}
                                    </Link>
                                </li>
                            );
                        }
                        
                        return (
                            <li key={n.id} className={`p-3 text-sm border-b border-[var(--border-color)] ${!n.seen ? 'bg-blue-900/20' : ''}`}>
                                {content}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="p-4 text-sm text-[var(--text-secondary)] text-center">No tienes notificaciones nuevas.</p>
            )}
        </div>
    );
};


const Header: React.FC = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [usersForNotifs, setUsersForNotifs] = useState<User[]>([]);

    const notifRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const hamburgerRef = useRef<HTMLButtonElement>(null);

    const hasUnseenNotifications = notifications.some(n => !n.seen);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (user) {
            unsubscribe = db.listenForNotificationsForUser(user.id, (newNotifications) => {
                setNotifications(newNotifications);
                const userIds = new Set<string>();
                newNotifications.forEach(n => {
                    if ('fromUserId' in n) userIds.add(n.fromUserId);
                    if ('adminId' in n) userIds.add(n.adminId);
                });
                if(userIds.size > 0) {
                    db.getUsersByIds(Array.from(userIds)).then(setUsersForNotifs);
                }
            });
        }
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
             if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (
                hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node) &&
                mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)
            ) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
        navigate('/');
    };

    const toggleNotifications = () => {
        const wasOpen = isNotifOpen;
        setIsNotifOpen(!wasOpen);
        if (!wasOpen && hasUnseenNotifications) {
            const unseenIds = notifications.filter(n => !n.seen).map(n => n.id);
            // FIX: Corrected the incomplete setTimeout call which caused a major syntax error.
            setTimeout(() => db.markNotificationsAsSeen(unseenIds), 3000);
        }
    };
    
    // FIX: Added missing handlers for accepting/declining tournament invites.
    const handleAcceptInvite = async (notifId: string, tournamentId: string) => {
        if (!user) return;
        await db.acceptTournamentInvite(notifId, user.id, tournamentId);
        setIsNotifOpen(false);
    };

    const handleDeclineInvite = async (notifId: string, tournamentId: string) => {
        if (!user) return;
        await db.declineTournamentInvite(notifId, user.id, tournamentId);
        setIsNotifOpen(false);
    };

    // FIX: Reconstructed the missing JSX return statement for the Header component.
    return (
        <header className="bg-[var(--background-medium)] border-b border-[var(--border-color)] sticky top-0 z-10">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Left side: Logo and Desktop Nav */}
                    <div className="flex items-center space-x-8">
                        <Link to="/" className="flex-shrink-0">
                            <AppLogo />
                        </Link>
                        <nav className="hidden md:flex space-x-6">
                            <NavLink to="/" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>Inicio</NavLink>
                            <NavLink to="/tournaments" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>Torneos</NavLink>
                            <NavLink to="/how-to-play" className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>Cómo Jugar</NavLink>
                        </nav>
                    </div>

                    {/* Right side: Icons and User Menu */}
                    <div className="flex items-center space-x-4">
                        <Link to="/search" className="text-[var(--text-secondary)] hover:text-white p-2 rounded-full">
                            <SearchIcon className="h-5 w-5" />
                        </Link>

                        {isAuthenticated && user ? (
                            <>
                                {/* Notifications */}
                                <div ref={notifRef} className="relative">
                                    <button onClick={toggleNotifications} className="text-[var(--text-secondary)] hover:text-white p-2 rounded-full relative">
                                        <BellIcon className="h-5 w-5" />
                                        {hasUnseenNotifications && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500" />}
                                    </button>
                                    {isNotifOpen && (
                                        <NotificationDropdown
                                            notifications={notifications}
                                            users={usersForNotifs}
                                            onAccept={handleAcceptInvite}
                                            onDecline={handleDeclineInvite}
                                            onClose={() => setIsNotifOpen(false)}
                                            currentUser={user}
                                        />
                                    )}
                                </div>

                                {/* Profile Dropdown */}
                                <div ref={profileMenuRef} className="relative">
                                    <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center space-x-2">
                                        <Avatar avatar={user.avatar} className="w-8 h-8" />
                                    </button>
                                    {isProfileMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] py-1 z-20">
                                            <Link to={`/profile/${user.id}`} onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-light)]">Mi Perfil</Link>
                                            {user.role === 'admin' && <Link to="/admin" onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-light)]">Admin</Link>}
                                            <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-[var(--background-light)]">Cerrar Sesión</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="hidden md:flex items-center space-x-2">
                                <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-md hover:bg-[var(--background-light)] transition-colors">Iniciar Sesión</Link>
                                <Link to="/register" className="text-sm font-medium px-4 py-2 rounded-md bg-[var(--accent-red)] text-white hover:opacity-90 transition-opacity">Registrarse</Link>
                            </div>
                        )}
                        
                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button ref={hamburgerRef} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-[var(--text-secondary)] hover:text-white p-2 rounded-md">
                                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                 <div ref={mobileMenuRef} className="md:hidden bg-[var(--background-medium)] border-b border-[var(--border-color)]">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                         <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[var(--accent-red)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-white'}`}>Inicio</NavLink>
                         <NavLink to="/tournaments" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[var(--accent-red)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-white'}`}>Torneos</NavLink>
                         <NavLink to="/how-to-play" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-md text-base font-medium ${isActive ? 'bg-[var(--accent-red)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-white'}`}>Cómo Jugar</NavLink>
                    </div>
                     {!isAuthenticated && (
                         <div className="px-2 pt-2 pb-3 space-y-2 border-t border-[var(--border-color)]">
                            <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center px-3 py-2 rounded-md text-base font-medium bg-gray-700 text-white">Iniciar Sesión</Link>
                            <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center px-3 py-2 rounded-md text-base font-medium bg-[var(--accent-red)] text-white">Registrarse</Link>
                         </div>
                     )}
                </div>
            )}
        </header>
    );
};

export default Header;
