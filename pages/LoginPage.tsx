
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [resetMessage, setResetMessage] = useState('');
  const { login, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        await login(email, password);
        navigate('/');
    } catch (err: any) {
        if (err.name === 'auth/email-not-verified') {
            setError('Tu cuenta no ha sido verificada. Por favor, revisa tu correo electrónico para completar el registro.');
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            setError('Credenciales inválidas. Revisa el email y la contraseña.');
        } else if (err.code === 'auth/wrong-password') {
            setError('La contraseña es incorrecta.');
        } else {
            setError('Ocurrió un error inesperado al iniciar sesión.');
        }
        console.error(err);
    } finally {
        setLoading(false);
    }
  };
  
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setResetMessage('Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.');
    } catch (err: any) {
      setError('No se pudo enviar el correo de restablecimiento. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background-dark)] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)]">
        <h1 className="text-4xl font-bold text-center f1-red-text">{APP_NAME}</h1>
        
        {view === 'login' ? (
          <>
            <h2 className="text-xl text-center text-[var(--text-primary)]">Iniciar Sesión</h2>
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                <div className="mt-1">
                  <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">Contraseña</label>
                    <button type="button" onClick={() => { setView('reset'); setError(''); setResetMessage(''); }} className="text-sm text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
                <div className="mt-1">
                  <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                </div>
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <div>
                <button type="submit" disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[var(--accent-red)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-medium)] focus:ring-[var(--accent-red)] disabled:opacity-50 transition-opacity">
                  {loading ? 'Procesando...' : 'Ingresar'}
                </button>
              </div>
            </form>
            <div className="text-center">
              <Link to="/register" className="text-sm text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                  ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl text-center text-[var(--text-primary)]">Restablecer Contraseña</h2>
            <form onSubmit={handleResetSubmit} className="space-y-6">
              <div>
                <label htmlFor="email-reset" className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                <div className="mt-1">
                  <input id="email-reset" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]" />
                </div>
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              {resetMessage && <p className="text-sm text-green-400 text-center">{resetMessage}</p>}
              <div>
                <button type="submit" disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[var(--accent-red)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-medium)] focus:ring-[var(--accent-red)] disabled:opacity-50 transition-opacity">
                  {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
                </button>
              </div>
            </form>
            <div className="text-center">
              <button onClick={() => { setView('login'); setError(''); setResetMessage(''); }} className="text-sm text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                  &larr; Volver a inicio de sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;