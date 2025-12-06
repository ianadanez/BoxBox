// firebaseconfig.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

// ==========================================================================================
// CONFIGURACIÓN SEGURA
// Las claves ahora se leen desde variables de entorno (archivo .env o configuración de Netlify).
// ==========================================================================================

// Fix for TypeScript error: Property 'env' does not exist on type 'ImportMeta'.
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Evita doble init con HMR
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const auth = firebase.auth();
export const firestore = firebase.firestore(); // FIX: Changed export name to 'firestore' to match db.ts

// Enable persistence
firestore.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence failed: failed-precondition. Multiple tabs open?');
    } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence failed: unimplemented. Browser not supported.');
    }
});

export const functions = firebase.functions();
