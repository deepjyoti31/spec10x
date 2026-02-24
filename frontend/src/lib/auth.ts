/**
 * Spec10x — Firebase Auth Helpers
 *
 * Firebase initialization and auth helper functions.
 * In development mode without Firebase config, provides a mock auth flow.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    Auth,
    updateProfile,
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-firebase-api-key');

// Initialize Firebase (only once)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string) {
    if (!auth) {
        // Dev mode — return mock token
        console.warn('[DEV MODE] Firebase not configured, using mock auth');
        return { token: 'dev-token', user: { email, uid: 'dev-user-001' } };
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    return { token, user: result.user };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, name?: string) {
    if (!auth) {
        console.warn('[DEV MODE] Firebase not configured, using mock auth');
        return { token: 'dev-token', user: { email, uid: 'dev-user-001', displayName: name } };
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
        await updateProfile(result.user, { displayName: name });
    }
    const token = await result.user.getIdToken();
    return { token, user: result.user };
}

/**
 * Sign in with Google OAuth
 */
export async function loginWithGoogle() {
    if (!auth) {
        console.warn('[DEV MODE] Firebase not configured, using mock auth');
        return { token: 'dev-token', user: { email: 'dev@spec10x.local', uid: 'dev-user-001' } };
    }

    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    return { token, user: result.user };
}

/**
 * Sign out the current user
 */
export async function logout() {
    if (!auth) return;
    await signOut(auth);
}

/**
 * Get the current user's ID token (for API calls)
 */
export async function getIdToken(): Promise<string | null> {
    if (!auth) {
        return 'dev-token';
    }

    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
        // Dev mode — immediately fire with null (no user)
        callback(null);
        return () => { };
    }

    return onAuthStateChanged(auth, callback);
}

/**
 * Check if Firebase is configured
 */
export function isAuthConfigured(): boolean {
    return isFirebaseConfigured;
}

export { auth };
export type { User };
