import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
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


// Helper type to combine Notification with the sender's User object
type RenderableNotification = 
    (ResultsNotification | PointsAdjustmentNotification) | 
    ((PokeNotification | TournamentInviteNotification | TournamentInviteAcceptedNotification | TournamentInviteDeclinedNotification) & { fromUser?: User });


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<RenderableNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProcessingNotif, setIsProcessingNotif] = useState<string | null>(null);
  const [nextGp, setNextGp] = useState<GrandPrix | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notificationContainerRef = useRef<HTMLDivElement>(null);
  
  // Derived state for unseen count. This prevents synchronization issues.
  const unseenCount = notifications.filter(n => !n.seen).length;

  useEffect(() => {
    const fetchNextGp = async () => {
        const schedule = await db.getSchedule();
        const now = new Date();
        const upcomingGps = schedule.filter(gp => new Date(gp.events.race) >= now);
        setNextGp(upcomingGps[0] || null);
    };
    fetchNextGp();
  }, []);

  // Single, robust effect to fetch and process notifications in real-time
  useEffect(() => {
    if (!user) {
        setNotifications([]);
        return;
    }

    const unsubscribe = db.listenForNotificationsForUser(user.id, async (rawNotifications) => {
        const fromUserIds = [...new Set(
            rawNotifications
                .filter((n): n is PokeNotification | TournamentInviteNotification | TournamentInviteAcceptedNotification | TournamentInviteDeclinedNotification => 
                    n.type === 'poke' || 
                    n.type === 'tournament_invite' ||
                    n.type === 'tournament_invite_accepted' ||
                    n.type === 'tournament_invite_declined'
                )
                .map((n) => n.fromUserId)
        )];

        let processedNotifications: RenderableNotification[] = rawNotifications;

        if (fromUserIds.length > 0) {
            const users = await db.getUsersByIds(fromUserIds);
            const usersById = new Map(users.map(u => [u.id, u]));
            
            processedNotifications = rawNotifications.map(n => {
                if (
                    n.type === 'poke' || 
                    n.type === 'tournament_invite' ||
                    n.type === 'tournament_invite_accepted' ||
                    n.type === 'tournament_invite_declined'
                ) {
                    return { ...n, fromUser: usersById.get(n.fromUserId) };
                }
                return n;
            });
        }
        
        setNotifications(processedNotifications);
    });

    return () => unsubscribe();
  }, [user]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationContainerRef.current && !notificationContainerRef.current.contains(event.target as Node)) {
            setIsNotificationsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  const handleMarkAllAsSeen = async () => {
    const unseenIds = notifications.filter(n => !n.seen).map(n => n.id);
    if (unseenIds.length > 0) {
      await db.markNotificationsAsSeen(unseenIds);
    }
  };
  
  const handleAcceptInvite = async (notification: TournamentInviteNotification) => {
    if (!user) return;
    setIsProcessingNotif(notification.id);
    const tournament = await db.acceptTournamentInvite(notification.id, user.id, notification.tournamentId);
    if (tournament) {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        setIsNotificationsOpen(false);
        navigate(`/tournaments`);
    } else {
        alert("No se pudo unir al torneo. Puede que haya sido eliminado.");
    }
    setIsProcessingNotif(null);
  };

  const handleDeclineInvite = async (notification: TournamentInviteNotification) => {
    if (!user) return;
    setIsProcessingNotif(notification.id);
    await db.declineTournamentInvite(notification.id, user.id, notification.tournamentId);
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    setIsProcessingNotif(null);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
      isActive 
        ? 'text-[var(--text-primary)]' 
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    } after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-1 after:h-[2px] after:bg-[var(--accent-red)] after:scale-x-0 after:transition-transform ${
      isActive ? 'after:scale-x-100' : 'hover:after:scale-x-100'
    }`;
    
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
     `block px-3 py-2 rounded-md text-base font-medium ${
        isActive
        ? 'bg-[var(--accent-red)] text-white'
        : 'text-[var(--text-secondary)] hover:bg-gray-700 hover:text-white'
     }`;

  const renderNotification = (notification: RenderableNotification) => {
    switch (notification.type) {
        case 'poke':
            const { fromUser } = notification;
            const userAvatar = fromUser?.avatar || { color: '#888', secondaryColor: '#555', skinColor: '#aaa', eyes: 'normal', pattern: 'none' };
            return (
                <div className="flex items-center space-x-3">
                    <Avatar avatar={userAvatar} className="w-8 h-8 flex-shrink-0" />
                    <p className="text-sm">
                        <Link to={`/profile/${fromUser?.id}`} onClick={() => setIsNotificationsOpen(false)} className="font-bold hover:underline">{fromUser?.name || 'Un usuario'}</Link> te ha dado un toque <span className="inline-block animate-wave">👋</span>
                    </p>
                </div>
            );
        case 'results':
            return (
                 <div className="flex items-center space-x-3">
                    <span className="text-2xl flex-shrink-0">🏁</span>
                    <p className="text-sm">
                        Tus resultados para el <span className="font-bold">{notification.gpName}</span> han sido actualizados.
                    </p>
                </div>
            );
        case 'points_adjustment':
            return (
                 <div className="flex items-center space-x-3">
                    <span className="text-2xl flex-shrink-0">⚖️</span>
                    <p className="text-sm">
                        Has recibido <span className={`font-bold ${notification.points > 0 ? 'text-green-400' : 'text-red-400'}`}>{notification.points}</span> puntos por: <span className="italic">"{notification.reason}"</span>
                    </p>
                </div>
            );
        case 'tournament_invite':
            const invite = notification as TournamentInviteNotification & { fromUser?: User };
            return (
                <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl flex-shrink-0">🏆</span>
                        <p className="text-sm">
                             <Link to={`/profile/${invite.fromUser?.id}`} onClick={() => setIsNotificationsOpen(false)} className="font-bold hover:underline">{invite.fromUser?.name || 'Un usuario'}</Link> te ha invitado a unirte a <span className="font-bold">{invite.tournamentName}</span>.
                        </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button 
                            onClick={() => handleDeclineInvite(invite)} 
                            disabled={isProcessingNotif === invite.id}
                            className="px-3 py-1 text-xs font-semibold bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                        >
                            Rechazar
                        </button>
                        <button 
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={isProcessingNotif === invite.id}
                            className="px-3 py-1 text-xs font-semibold bg-[var(--accent-blue)] text-black hover:opacity-80 rounded-md transition-colors disabled:opacity-50"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            );
        case 'tournament_invite_accepted':
            const accepted = notification as TournamentInviteAcceptedNotification & { fromUser?: User };
            return (
                <div className="flex items-center space-x-3">
                    <span className="text-2xl flex-shrink-0">✅</span>
                    <p className="text-sm">
                        <Link to={`/profile/${accepted.fromUser?.id}`} onClick={() => setIsNotificationsOpen(false)} className="font-bold hover:underline">{accepted.fromUser?.name || 'Un usuario'}</Link> ha aceptado tu invitación para unirte a <Link to="/tournaments" onClick={() => setIsNotificationsOpen(false)} className="font-bold hover:underline">{accepted.tournamentName}</Link>.
                    </p>
                </div>
            );
        case 'tournament_invite_declined':
            const declined = notification as TournamentInviteDeclinedNotification & { fromUser?: User };
             return (
                <div className="flex items-center space-x-3">
                    <span className="text-2xl flex-shrink-0">❌</span>
                    <p className="text-sm">
                        <Link to={`/profile/${declined.fromUser?.id}`} onClick={() => setIsNotificationsOpen(false)} className="font-bold hover:underline">{declined.fromUser?.name || 'Un usuario'}</Link> ha rechazado tu invitación para unirte a <span className="font-bold">{declined.tournamentName}</span>.
                    </p>
                </div>
            );
        default:
            return null;
    }
  }

  return (
    <header className="bg-[var(--background-medium)]/80 backdrop-blur-sm border-b border-[var(--border-color)] sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="text-2xl font-bold f1-red-text hover:opacity-80 transition-opacity">
              {APP_NAME}
            </NavLink>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <NavLink to="/" className={navLinkClass}>Inicio</NavLink>
                {user && nextGp && (
                    <NavLink to={`/predict/${nextGp.id}`} className={navLinkClass}>Predecir</NavLink>
                )}
                <NavLink to="/tournaments" className={navLinkClass}>Torneos</NavLink>
                {user?.role === 'admin' && (
                  <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden md:block">
                <NavLink 
                    to="/search"
                    title="Buscar"
                    className={({ isActive }) => `block p-2 rounded-md transition-colors ${isActive ? 'text-[var(--text-primary)] bg-[var(--background-light)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    <SearchIcon className="h-6 w-6"/>
                </NavLink>
            </div>

            {user ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                <div ref={notificationContainerRef} className="relative">
                    <button onClick={handleOpenNotifications} className="relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1">
                        <BellIcon className="h-6 w-6" />
                        {unseenCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-red)] text-xs font-bold text-white">
                                {unseenCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div className="absolute top-full right-0 mt-3 w-80 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-20">
                           <div className="p-3 bg-[var(--background-light)] text-sm font-bold text-[var(--text-primary)] flex justify-between items-center">
                                <span>Notificaciones</span>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleMarkAllAsSeen}
                                        disabled={unseenCount === 0}
                                        className="text-xs font-semibold text-[var(--accent-blue)] hover:text-opacity-80 disabled:text-[var(--text-secondary)] disabled:hover:text-opacity-100 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Marcar todas como leídas
                                    </button>
                                )}
                           </div>
                            {notifications.length > 0 ? (
                                <ul className="max-h-96 overflow-y-auto">
                                    {notifications.map(notification => (
                                        <li key={notification.id} className={`p-3 border-t border-[var(--border-color)] transition-opacity ${notification.seen ? 'opacity-60' : ''}`}>
                                            {renderNotification(notification)}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-4 text-sm text-center text-[var(--text-secondary)]">No tienes notificaciones.</p>
                            )}
                        </div>
                    )}
                </div>

                 <NavLink to={`/profile/${user.id}`} className="flex items-center space-x-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <Avatar avatar={user.avatar} className="w-9 h-9"/>
                    <span className="font-medium hidden sm:block">{user.name}</span>
                 </NavLink>
                <button
                  onClick={handleLogout}
                  className="bg-transparent border border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white px-4 py-2 rounded-md text-sm font-bold transition-colors hidden sm:block"
                >
                  Salir
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="bg-[var(--accent-red)] hover:opacity-90 text-white px-4 py-2 rounded-md text-sm font-bold transition-opacity"
              >
                Ingresar
              </NavLink>
            )}
            
             <div className="md:hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-light)] focus:outline-none"
                    aria-controls="mobile-menu"
                    aria-expanded={isMobileMenuOpen}
                >
                    <span className="sr-only">Abrir menú principal</span>
                    {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                </button>
            </div>
          </div>
        </div>
      </nav>
      {isMobileMenuOpen && (
            <div className="md:hidden" id="mobile-menu">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    <NavLink to="/" className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Inicio</NavLink>
                    {user && nextGp && (
                        <NavLink to={`/predict/${nextGp.id}`} className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Predecir</NavLink>
                    )}
                    <NavLink to="/tournaments" className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Torneos</NavLink>
                    <NavLink to="/search" className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Buscar</NavLink>
                    {user?.role === 'admin' && (
                        <NavLink to="/admin" className={mobileNavLinkClass} onClick={() => setIsMobileMenuOpen(false)}>Admin</NavLink>
                    )}
                    {user && (
                         <button
                            onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                            className="w-full text-left sm:hidden mt-2 block px-3 py-2 rounded-md text-base font-medium text-[var(--text-secondary)] hover:bg-gray-700 hover:text-white"
                        >
                          Salir
                        </button>
                    )}
                </div>
            </div>
        )}
    </header>
  );
};

export default Header;