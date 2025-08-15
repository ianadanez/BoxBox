
// Import the functions you need from the SDKs you need
import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "@firebase/firestore";
import { getFunctions } from "@firebase/functions";


// IMPORTANT: REPLACE WITH YOUR WEB APP'S FIREBASE CONFIGURATION
// You can get this from the Firebase console:
// Project settings > General > Your apps > SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLo-DqqiWikm0QVBCUdtMf6_vK-uN9kj0",
  authDomain: "f1prode-58763.firebaseapp.com",
  projectId: "f1prode-58763",
  storageBucket: "f1prode-58763.firebasestorage.app",
  messagingSenderId: "452234982033",
  appId: "1:452234982033:web:e26c4f3d02c20a68fb4530"
};

// Initialize Firebase and export the services for use in other parts of the app
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app);
export const functions = getFunctions(app);

// Enable Firestore offline persistence
enableIndexedDbPersistence(firestoreDb)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      // This is not a critical error, the app will still work.
      console.warn("Firestore persistence failed: multiple tabs open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Firestore persistence is not available in this browser.");
    }
  });