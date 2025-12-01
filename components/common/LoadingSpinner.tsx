
import React from 'react';

const LoadingSpinner: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = true }) => {
  return (
    <div className={`${fullScreen ? 'min-h-[50vh] flex-grow' : 'h-full'} flex flex-col items-center justify-center p-8`}>
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full border-4 border-[var(--background-light)]"></div>
        <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full border-4 border-t-[var(--accent-red)] animate-spin"></div>
      </div>
      <p className="mt-4 text-[var(--text-secondary)] text-sm animate-pulse">Cargando boxes...</p>
    </div>
  );
};

export default LoadingSpinner;
