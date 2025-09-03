
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

// REMOVED BASE64 to use a direct URL approach.
// User will replace the placeholder URL with their own hosted image link.
const LOGO_URL_PLACEHOLDER = "https://imgur.com/a/jSqjazT";


const NotificationItem: React.FC<{ notif: Notification, users: User[], onAction: (notif: Notification, action: 'accept' | 'decline') => void }> = ({ notif, users, onAction }) => {
    const fromUser = users.find(u => u.id === (notif as any).fromUserId);

    const renderContent = () => {
        switch (notif.type) {
            case 'poke':
                return <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> te ha dado un toque. 👋</p>;
            case 'results':
                return <p>🏆 ¡Ya están los resultados del <span className="font-bold">{notif.gpName}</span>!</p>;
            case 'points_adjustment':
                 return <p>Admin te ha {notif.points > 0 ? 'dado' : 'quitado'} <span className={`font-bold ${notif.points > 0 ? 'text-green-400' : 'text-red-400'}`}>{Math.abs(notif.points)}</span> puntos. Motivo: {notif.reason}</p>;
            case 'tournament_invite':
                return (
                    <div>
                        <p><span className="font-bold">{fromUser?.name || 'Alguien'}</span> te ha invitado al torneo <span className="font-bold">{notif.tournamentName}</span>.</p>
                        <div className="flex space-x-2 mt-2">
                            <button onClick={() => onAction(notif, 'accept')} className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md">Aceptar</button>
                            <button onClick={() => onAction(notif, 'decline')} className="text-xs bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md">Rechazar</button>
                        </div>
                    </div>
                );
            case 'tournament_invite_accepted':
                 return <p>✅ <span className="font-bold">{fromUser?.name || 'Alguien'}</span> ha aceptado tu invitación al torneo <span className="font-bold">{notif.tournamentName}</span>.</p>;
            case 'tournament_invite_declined':
                 return <p>❌ <span className="font-bold">{fromUser?.name || 'Alguien'}</span> ha rechazado tu invitación al torneo <span className="font-bold">{notif.tournamentName}</span>.</p>;
            default:
                return <p>Tienes una nueva notificación.</p>;
        }
    };
    
    return (
        <li className={`p-3 border-b border-[var(--border-color)] ${!notif.seen ? 'bg-red-900/20' : ''}`}>
            {renderContent()}
            <span className="text-xs text-gray-500 mt-1 block">{new Date(notif.timestamp).toLocaleString()}</span>
        </li>
    );
};


const Header: React.FC = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationUsers, setNotificationUsers] = useState<User[]>([]);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const [nextGp, setNextGp] = useState<GrandPrix | null>(null);

    const hasUnseenNotifications = notifications.some(n => !n.seen);

    useEffect(() => {
        if (!user) return;
        
        const unsubscribe = db.listenForNotificationsForUser(user.id, (newNotifications) => {
            setNotifications(newNotifications);
            const userIds = newNotifications
                .map(n => (n as any).fromUserId)
                .filter((id, index, self) => id && self.indexOf(id) === index); // Unique IDs
            
            if (userIds.length > 0) {
                db.getUsersByIds(userIds).then(setNotificationUsers);
            }
        });

        return () => unsubscribe();
    }, [user]);
    
    useEffect(() => {
        const getNextGp = async () => {
            const schedule = await db.getSchedule();
            const now = new Date();
            const upcoming = schedule
                .filter(gp => new Date(gp.events.race) >= now)
                .sort((a,b) => new Date(a.events.race).getTime() - new Date(b.events.race).getTime());
            setNextGp(upcoming[0] || null);
        };
        getNextGp();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };
    
    const handleToggleNotifications = () => {
        setIsNotificationsOpen(!isNotificationsOpen);
        if (hasUnseenNotifications) {
            const unseenIds = notifications.filter(n => !n.seen).map(n => n.id);
            db.markNotificationsAsSeen(unseenIds);
        }
    };

    const handleNotificationAction = async (notif: Notification, action: 'accept' | 'decline') => {
        if (notif.type !== 'tournament_invite' || !user) return;

        if (action === 'accept') {
            const updatedTournament = await db.acceptTournamentInvite(notif.id, user.id, notif.tournamentId);
            if (updatedTournament) {
                alert(`Te uniste a ${updatedTournament.name}`);
            } else {
                alert('El torneo ya no existe.');
            }
        } else {
            await db.declineTournamentInvite(notif.id, user.id, notif.tournamentId);
            alert('Invitación rechazada.');
        }
    };
    
     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeLinkClass = "bg-[var(--background-light)] text-[var(--text-primary)]";
    const inactiveLinkClass = "text-[var(--text-secondary)] hover:bg-[var(--background-light)] hover:text-[var(--text-primary)]";
    const linkClasses = `px-3 py-2 rounded-md text-sm font-medium transition-colors`;

    return (
        <header className="bg-[var(--background-medium)] border-b border-[var(--border-color)] sticky top-0 z-50 shadow-lg shadow-black/20">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center space-x-2">
                           <img 
                                src={LOGO_URL_PLACEHOLDER}
                                alt="BoxBox Logo"
                                className="h-10 w-auto"
                            />
                        </Link>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <NavLink to="/" className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Inicio</NavLink>
                                {nextGp && <NavLink to={`/predict/${nextGp.id}`} className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Predecir</NavLink>}
                                <NavLink to="/tournaments" className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Torneos</NavLink>
                                <NavLink to="/how-to-play" className={({isActive}) => `${linkClasses} ${isActive ? activeLinkClass : inactiveLinkClass}`}>¿Cómo Jugar?</NavLink>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated && user ? (
                            <>
                                <Link to="/search" className={inactiveLinkClass + " p-2 rounded-full"}><SearchIcon /></Link>
                                <div className="relative" ref={notificationsRef}>
                                    <button onClick={handleToggleNotifications} className={inactiveLinkClass + " p-2 rounded-full relative"}>
                                        <BellIcon />
                                        {hasUnseenNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[var(--accent-red)] ring-2 ring-[var(--background-medium)]" />}
                                    </button>
                                     {isNotificationsOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-[var(--background-medium)] ring-1 ring-[var(--border-color)] ring-opacity-5 focus:outline-none">
                                            <div className="py-1">
                                                <h3 className="px-3 py-2 text-sm font-semibold text-white border-b border-[var(--border-color)]">Notificaciones</h3>
                                                 {notifications.length > 0 ? (
                                                    <ul className="max-h-96 overflow-y-auto">
                                                        {notifications.map(n => <NotificationItem key={n.id} notif={n} users={notificationUsers} onAction={handleNotificationAction} />)}
                                                    </ul>
                                                ) : (
                                                    <p className="p-4 text-sm text-gray-500">No tienes notificaciones.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Link to={`/profile/${user.id}`} className="flex items-center space-x-2 p-1 pr-3 rounded-full hover:bg-[var(--background-light)] transition-colors">
                                    <Avatar avatar={user.avatar} className="w-8 h-8"/>
                                    <span className="text-sm font-medium">{user.name}</span>
                                </Link>
                                {user.role === 'admin' && <Link to="/admin" className="text-sm font-bold bg-yellow-600 text-black px-3 py-1.5 rounded-md hover:bg-yellow-700 transition-colors">Admin</Link>}
                                <button onClick={handleLogout} className="text-sm font-medium bg-red-800 px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors">Salir</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className={`${linkClasses} ${inactiveLinkClass}`}>Iniciar Sesión</Link>
                                <Link to="/register" className={`${linkClasses} bg-[var(--accent-red)] text-white hover:opacity-90`}>Registrarse</Link>
                            </>
                        )}
                    </div>
                    <div className="-mr-2 flex md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>
            </nav>

             {isMenuOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <NavLink to="/" onClick={()=>setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} block ${isActive ? activeLinkClass : inactiveLinkClass}`}>Inicio</NavLink>
                         {nextGp && <NavLink to={`/predict/${nextGp.id}`} onClick={()=>setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} block ${isActive ? activeLinkClass : inactiveLinkClass}`}>Predecir</NavLink>}
                        <NavLink to="/tournaments" onClick={()=>setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} block ${isActive ? activeLinkClass : inactiveLinkClass}`}>Torneos</NavLink>
                        <NavLink to="/how-to-play" onClick={()=>setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} block ${isActive ? activeLinkClass : inactiveLinkClass}`}>¿Cómo Jugar?</NavLink>
                        <NavLink to="/search" onClick={()=>setIsMenuOpen(false)} className={({isActive}) => `${linkClasses} block ${isActive ? activeLinkClass : inactiveLinkClass}`}>Buscar</NavLink>
                    </div>
                    <div className="pt-4 pb-3 border-t border-[var(--border-color)]">
                        {isAuthenticated && user ? (
                            <div className="px-5">
                                <div className="flex items-center space-x-3 mb-3">
                                    <Avatar avatar={user.avatar} className="w-10 h-10"/>
                                    <div>
                                        <div className="text-base font-medium leading-none text-white">{user.name}</div>
                                        <div className="text-sm font-medium leading-none text-gray-400">{user.email}</div>
                                    </div>
                                    <div className="relative ml-auto" ref={notificationsRef}>
                                        <button onClick={handleToggleNotifications} className="p-2 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                           <BellIcon />
                                           {hasUnseenNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[var(--accent-red)] ring-2 ring-gray-800" />}
                                        </button>
                                        {isNotificationsOpen && (
                                           <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-[var(--background-medium)] ring-1 ring-[var(--border-color)] ring-opacity-5 focus:outline-none">
                                                <h3 className="px-3 py-2 text-sm font-semibold text-white border-b border-[var(--border-color)]">Notificaciones</h3>
                                                 {notifications.length > 0 ? (
                                                    <ul className="max-h-96 overflow-y-auto">
                                                        {notifications.map(n => <NotificationItem key={n.id} notif={n} users={notificationUsers} onAction={handleNotificationAction} />)}
                                                    </ul>
                                                ) : (
                                                    <p className="p-4 text-sm text-gray-500">No tienes notificaciones.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <Link to={`/profile/${user.id}`} onClick={()=>setIsMenuOpen(false)} className={`${linkClasses} block`}>Mi Perfil</Link>
                                    {user.role === 'admin' && <Link to="/admin" onClick={()=>setIsMenuOpen(false)} className={`${linkClasses} block bg-yellow-600/20 text-yellow-300`}>Admin Panel</Link>}
                                    <button onClick={()=>{handleLogout(); setIsMenuOpen(false);}} className={`${linkClasses} block w-full text-left`}>Salir</button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-2 space-y-1">
                                 <Link to="/login" onClick={()=>setIsMenuOpen(false)} className={`${linkClasses} block`}>Iniciar Sesión</Link>
                                 <Link to="/register" onClick={()=>setIsMenuOpen(false)} className={`${linkClasses} block bg-[var(--accent-red)] text-white hover:opacity-90`}>Registrarse</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
