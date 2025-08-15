// firebaseconfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: 'AIzaSyCLo-DqqiWikm0QVBCUdtMf6_vK-uN9kj0',
  authDomain: 'f1prode-58763.firebaseapp.com',
  projectId: 'f1prode-58763',
  storageBucket: 'f1prode-58763.firebasestorage.app',
  messagingSenderId: '452234982033',
  appId: '1:452234982033:web:e26c4f3d02c20a68fb4530'
}

// Evita doble init con HMR
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const firestoreDb = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, // o experimentalForceLongPolling: true
  useFetchStreams: false,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

export const functions = getFunctions(app)
