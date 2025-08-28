import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { applyActionCode } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');

    if (oobCode) {
      const verifyEmail = async () => {
        try {
          await applyActionCode(oobCode);
          setStatus('success');
        } catch (error: any) {
          console.error('Error verifying email:', error);
          if (error.code === 'auth/invalid-action-code') {
            setErrorMessage('El enlace de verificación es inválido o ha caducado. Por favor, intenta registrarte de nuevo.');
          } else {
            setErrorMessage('Ocurrió un error al verificar tu correo electrónico.');
          }
          setStatus('error');
        }
      };
      verifyEmail();
    } else {
      setErrorMessage('No se encontró un código de verificación.');
      setStatus('error');
    }
  }, [searchParams, applyActionCode]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return <p className="text-lg text-gray-300">Verificando tu correo electrónico...</p>;
      case 'success':
        return (
          <>
            <h1 className="text-3xl font-bold text-green-400">¡Correo Verificado!</h1>
            <p className="text-lg text-gray-200 mt-2">Tu cuenta ha sido activada con éxito.</p>
            <p className="text-gray-400 mt-4">Ya puedes iniciar sesión para comenzar a jugar.</p>
            <Link
              to="/login"
              className="mt-8 inline-block w-full max-w-xs bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-3 px-6 rounded-md text-lg transition-opacity"
            >
              Iniciar Sesión
            </Link>
          </>
        );
      case 'error':
        return (
          <>
            <h1 className="text-3xl font-bold text-red-500">Error de Verificación</h1>
            <p className="text-lg text-gray-300 mt-2">{errorMessage}</p>
             <Link
              to="/register"
              className="mt-8 inline-block w-full max-w-xs bg-[var(--accent-blue)] hover:opacity-80 text-black font-bold py-3 px-6 rounded-md text-lg transition-opacity"
            >
              Volver a Registrarse
            </Link>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--background-dark)] p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-[var(--background-medium)] rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] text-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerificationPage;