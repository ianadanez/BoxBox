
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        await login(email, password);
        navigate('/');
    } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background-dark)] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)]">
        <h1 className="text-4xl font-bold text-center f1-red-text">{APP_NAME}</h1>
        <h2 className="text-xl text-center text-[var(--text-primary)]">Iniciar Sesión</h2>
        
        <div className="text-center text-sm text-[var(--text-secondary)] bg-[var(--background-light)] p-3 rounded-lg">
            <p><strong>Modo de Prueba:</strong> La contraseña para todas las cuentas de prueba es <strong>password</strong>.</p>
            <p>Puedes usar: <strong>admin@boxbox.com</strong> o <strong>user1@boxbox.com</strong>, etc.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]"
              />
            </div>
          </div>

           <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">
              Contraseña
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-white bg-[var(--background-light)] border border-[var(--border-color)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)] focus:border-[var(--accent-red)]"
              />
            </div>
          </div>
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[var(--accent-red)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-medium)] focus:ring-[var(--accent-red)] disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Procesando...' : 'Ingresar'}
            </button>
          </div>
        </form>

        <div className="text-center">
            <Link to="/register" className="text-sm text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                ¿No tienes cuenta? Regístrate
            </Link>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
