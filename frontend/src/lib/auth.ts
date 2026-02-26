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

// Dev mode session key
const DEV_SESSION_KEY = 'spec10x_dev_session';

/**
 * Save dev session to sessionStorage
 */
function saveDevSession(email: string) {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify({ email, uid: 'dev-user-001' }));
    }
}

/**
 * Clear dev session from sessionStorage
 */
function clearDevSession() {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(DEV_SESSION_KEY);
    }
}

/**
 * Check if a dev session exists
 */
function getDevSession(): { email: string; uid: string } | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(DEV_SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string) {
    if (!auth) {
        // Dev mode — return mock token and persist session
        console.warn('[DEV MODE] Firebase not configured, using mock auth');
        saveDevSession(email);
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
        saveDevSession(email);
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
        saveDevSession('dev@spec10x.local');
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
    clearDevSession();
    if (!auth) return;
    await signOut(auth);
}

/**
 * Get the current user's ID token (for API calls)
 */
export async function getIdToken(): Promise<string | null> {
    if (!auth) {
        // Dev mode — return token if session exists
        return getDevSession() ? 'dev-token' : null;
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
        // Dev mode — check if we have a dev session
        const session = getDevSession();
        if (session) {
            // Simulate a "signed in" user with a minimal mock User object
            const mockUser = { uid: session.uid, email: session.email } as unknown as User;
            setTimeout(() => callback(mockUser), 0);
        } else {
            setTimeout(() => callback(null), 0);
        }
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
