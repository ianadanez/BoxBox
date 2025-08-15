
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrateLocalStorageToFirebase } from './services/db';

// Expose migration function to the window for one-time use from the console
(window as any).migrateLocalStorageToFirebase = migrateLocalStorageToFirebase;

console.log(
  `%c[MIGRATION] %cPara migrar los datos de LocalStorage a Firebase, ejecuta 'await window.migrateLocalStorageToFirebase()' en la consola.`,
  'color: #e10600; font-weight: bold;',
  'color: #f4f4f5;'
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
