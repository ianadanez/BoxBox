
import React, { useState, useEffect } from 'react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('boxbox_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('boxbox_cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--background-light)] border-t border-[var(--border-color)] p-4 shadow-2xl z-50 animate-slide-up">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[var(--text-secondary)] text-center md:text-left">
          Usamos cookies y tecnologías similares para mejorar tu experiencia, personalizar el contenido y mostrar anuncios relevantes. 
          Al continuar navegando, aceptas nuestro uso de cookies.
        </p>
        <div className="flex gap-4">
            <button 
                onClick={handleAccept}
                className="bg-[var(--accent-red)] hover:opacity-90 text-white font-bold py-2 px-6 rounded-md transition-opacity text-sm whitespace-nowrap"
            >
                Aceptar Cookies
            </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
