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
    sendEmailVerification,
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
    if (!auth) throw new Error('Firebase Auth is not initialized');

    const result = await signInWithEmailAndPassword(auth, email, password);

    // Check if email is verified
    if (!result.user.emailVerified) {
        // Sign out the unverified user
        await signOut(auth);
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
    }

    const token = await result.user.getIdToken();
    return { token, user: result.user };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, name?: string) {
    if (!auth) throw new Error('Firebase Auth is not initialized');

    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
        await updateProfile(result.user, { displayName: name });
    }

    // Send verification email
    await sendEmailVerification(result.user);

    // Sign out immediately — user must verify email first
    await signOut(auth);

    return { token: null, user: result.user, emailVerified: false };
}

/**
 * Sign in with Google OAuth
 */
export async function loginWithGoogle() {
    if (!auth) throw new Error('Firebase Auth is not initialized');

    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    return { token, user: result.user };
}

/**
 * Sign out the current user
 */
export async function logout() {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    await signOut(auth);
}

/**
 * Get the current user's ID token (for API calls)
 */
export async function getIdToken(): Promise<string | null> {
    if (!auth) throw new Error('Firebase Auth is not initialized');

    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
        console.error('Firebase Auth is not initialized');
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

/**
 * Resend email verification to the current user
 */
export async function resendVerificationEmail(email: string, password: string) {
    if (!auth) return;
    const result = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    await signOut(auth);
}

export { auth };
export type { User };
