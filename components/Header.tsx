
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './common/Avatar';
import { User, Notification, PokeNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification, GrandPrix } from '../types';
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

const AppLogo = () => (
    <img src="https://i.imgur.com/VfzbTsC.png" alt="BoxBox Logo" className="h-10 w-auto" />
);


const NotificationDropdown: React.FC<{ notifications: Notification[], users: User[], onAccept: (notifId: string, tournamentId: string) => void, onDecline: (notifId: string, tournamentId: string) => void }> = ({ notifications, users, onAccept, onDecline }) => {
    
    const getUser = (id: string): User | undefined => users.find(u => u.id === id);

    const renderNotificationContent = (n: Notification) => {
        const fromUser = getUser('fromUserId' in n ? n.fromUserId : '');
        switch (n.type) {
            case 'poke':
                return <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> te ha dado un toque 👋.</p>;
            case 'results':
                return <p>Ya están los resultados del <span className="font-bold">{n.gpName}</span>.</p>;
            case 'points_adjustment':
                const admin = getUser(n.adminId);
                const verb = n.points > 0 ? 'añadido' : 'quitado';
                return <p><span className="font-bold">{admin?.name || 'Un admin'}</span> te ha {verb} <span className="font-bold">{Math.abs(n.points)}</span> puntos. Motivo: {n.reason}</p>;
            case 'tournament_invite':
                return (
                    <div>
                        <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> te ha invitado al torneo <span className="font-bold">{n.tournamentName}</span>.</p>
                        <div className="flex space-x-2 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); onAccept(n.id, n.tournamentId); }} className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md">Aceptar</button>
                            <button onClick={(e) => { e.stopPropagation(); onDecline(n.id, n.tournamentId); }} className="text-xs bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md">Rechazar</button>
                        </div>
                    </div>
                );
            case 'tournament_invite_accepted':
                 return <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> ha aceptado tu invitación a <span className="font-bold">{n.tournamentName}</span>.</p>;
            case 'tournament_invite_declined':
                return <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> ha rechazado tu invitación a <span className="font-bold">{n.tournamentName}</span>.</p>;
            default:
                return <p>Tienes una nueva notificación.</p>;
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] overflow-hidden z-20">
            <div className="p-3 border-b border-[var(--border-color)]">
                <h3 className="font-bold text-[var(--text-primary)]">Notificaciones</h3>
            </div>
            {notifications.length > 0 ? (
                <ul className="max-h-96 overflow-y-auto">
                    {notifications.map(n => (
                        <li key={n.id} className={`p-3 text-sm border-b border-[var(--border-color)] hover:bg-[var(--background-light)] transition-colors ${!n.seen ? 'bg-blue-900/20' : ''}`}>
                            {renderNotificationContent(n)}
                            <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                        </li>
                    ))}
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [usersForNotifs, setUsersForNotifs] = useState<User[]>([]);
    const notifRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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
             if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const toggleNotifications = () => {
        const wasOpen = isNotifOpen;
        setIsNotifOpen(!wasOpen);
        if (!wasOpen && hasUnseenNotifications) {
            const unseenIds = notifications.filter(n => !n.seen).map(n => n.id);
            setTimeout(() => db.markNotificationsAsSeen(unseenIds), 2000);
        }
    };
    
    const handleAcceptInvite = async (notificationId: string, tournamentId: string) => {
        if (!user) return;
        await db.acceptTournamentInvite(notificationId, user.id, tournamentId);
        // Notification listener will update the list automatically
    };

    const handleDeclineInvite = async (notificationId: string, tournamentId: string) => {
        if (!user) return;
        await db.declineTournamentInvite(notificationId, user.id, tournamentId);
        // Notification listener will update the list automatically
    };

    const NavItem: React.FC<{ to: string, children: React.ReactNode }> = ({ to, children }) => (
        <NavLink to={to} onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-white bg-[var(--accent-red)]' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-light)]'}`}>
            {children}
        </NavLink>
    );

    return (
        <header className="bg-[var(--background-medium)]/80 backdrop-blur-sm border-b border-[var(--border-color)] sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="flex items-center justify-between py-6">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0" aria-label="BoxBox Home">
                           <AppLogo />
                        </Link>
                        <nav className="hidden md:block ml-10">
                            <div className="flex items-baseline space-x-4">
                                <NavItem to="/">Inicio</NavItem>
                                {isAuthenticated && <NavItem to="/tournaments">Torneos</NavItem>}
                                <NavItem to="/how-to-play">Cómo Jugar</NavItem>
                                {user?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
                            </div>
                        </nav>
                    </div>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Link to="/search" className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                <span className="sr-only">Buscar</span>
                                <SearchIcon className="h-6 w-6" />
                            </Link>
                        </div>
                        {isAuthenticated && user ? (
                            <>
                                <div ref={notifRef} className="ml-3 relative">
                                    <button onClick={toggleNotifications} className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                        <span className="sr-only">Ver notificaciones</span>
                                        <BellIcon className="h-6 w-6" />
                                        {hasUnseenNotifications && (
                                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[var(--accent-blue)] ring-2 ring-[var(--background-medium)]"></span>
                                        )}
                                    </button>
                                    {isNotifOpen && <NotificationDropdown notifications={notifications} users={usersForNotifs} onAccept={handleAcceptInvite} onDecline={handleDeclineInvite} />}
                                </div>
                                <div ref={menuRef} className="ml-3 relative">
                                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                        <span className="sr-only">Abrir menú de usuario</span>
                                        <Avatar avatar={user.avatar} className="w-8 h-8"/>
                                    </button>
                                    {isMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[var(--background-medium)] ring-1 ring-black ring-opacity-5 focus:outline-none border border-[var(--border-color)]">
                                            <Link to={`/profile/${user.id}`} onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-white w-full text-left">Mi Perfil</Link>
                                            <button onClick={handleLogout} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-white w-full text-left">Cerrar Sesión</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                           <div className="hidden md:flex items-center space-x-2 ml-4">
                                <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-light)] transition-colors">Iniciar Sesión</Link>
                                <Link to="/register" className="px-3 py-2 rounded-md text-sm font-medium text-white bg-[var(--accent-red)] hover:opacity-90 transition-opacity">Registrarse</Link>
                           </div>
                        )}
                         <div className="md:hidden ml-2">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-light)]">
                                {isMenuOpen ? <CloseIcon className="h-6 w-6"/> : <MenuIcon className="h-6 w-6"/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <NavItem to="/">Inicio</NavItem>
                        {isAuthenticated && <NavItem to="/tournaments">Torneos</NavItem>}
                        <NavItem to="/how-to-play">Cómo Jugar</NavItem>
                        {user?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
                        {!isAuthenticated && (
                            <>
                                <NavItem to="/login">Iniciar Sesión</NavItem>
                                <NavItem to="/register">Registrarse</NavItem>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
