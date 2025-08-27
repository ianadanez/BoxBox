// firebaseconfig.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCLo-DqqiWikm0QVBCUdtMf6_vK-uN9kj0",
  authDomain: "f1prode-58763.firebaseapp.com",
  databaseURL: "https://f1prode-58763-default-rtdb.firebaseio.com",
  projectId: "f1prode-58763",
  storageBucket: "f1prode-58763.firebasestorage.app",
  messagingSenderId: "452234982033",
  appId: "1:452234982033:web:e26c4f3d02c20a68fb4530",
  measurementId: "G-4GV8G7VESP"
};

// Evita doble init con HMR
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const auth = firebase.auth();
export const firestoreDb = firebase.firestore();
// Enable persistence, equivalent to the original modular setup
firestoreDb.enablePersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a time.
        console.warn('Firebase persistence failed: failed-precondition. Multiple tabs open?');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        console.warn('Firebase persistence failed: unimplemented. Browser not supported.');
    }
});