/**
 * Firebase Configuration
 *
 * Values come from EXPO_PUBLIC_* variables, which Expo inlines at build time.
 * See .env.example for the full list.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { Auth, Persistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/**
 * Metro resolves firebase/auth to its React Native build, which exports this,
 * but the package lists a single top-level "types" entry ahead of its
 * react-native condition, so TypeScript only ever sees the web surface and
 * reports the symbol as missing. The cast is the narrow workaround.
 */
const { getReactNativePersistence } = firebaseAuth as unknown as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

/**
 * Auth is initialised with AsyncStorage persistence rather than through
 * getAuth(). Without it the SDK falls back to in-memory persistence on React
 * Native, which signs the user out every time the app restarts. That is
 * invisible in Expo Go, where the app is rarely killed, and obvious in a
 * standalone build.
 */
let authInstance: Auth;
try {
    authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
} catch {
    // Two cases land here, and getAuth is right for both. On the web build the
    // symbol above does not exist, and the browser SDK persists to IndexedDB on
    // its own. Under Fast Refresh this module re-runs against an app whose Auth
    // is already initialised, which initializeAuth rejects.
    authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);

export default app;
