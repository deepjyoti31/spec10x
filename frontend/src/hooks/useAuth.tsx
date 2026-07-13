/**
 * Spec10x — Auth Context Provider
 *
 * Manages authentication state across the app.
 * Wraps Firebase's auth state with our API user data.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, getIdToken, logout as firebaseLogout, User as FirebaseUser } from '@/lib/auth';
import { api, UserResponse } from '@/lib/api';

interface AuthContextType {
    user: UserResponse | null;
    firebaseUser: FirebaseUser | null;
    token: string | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    token: null,
    loading: true,
    logout: async () => { },
});

// E2E smoke-test bypass — only active in builds made with
// NEXT_PUBLIC_E2E_AUTH_BYPASS=1 (never the production build). The smoke
// suite intercepts all /api/* calls, so this token is never sent to a
// real backend.
const E2E_AUTH_BYPASS = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1';

const E2E_USER: UserResponse = {
    id: 'e2e-smoke-user',
    email: 'smoke@spec10x.test',
    name: 'Smoke Test',
    plan: 'pro',
    created_at: '2026-01-01T00:00:00Z',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Must stay inside the effect (not state initializers) so pages do
        // not prerender with a signed-in user during `next build`.
        if (E2E_AUTH_BYPASS) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUser(E2E_USER);
            setToken('e2e-smoke-token');
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthChange(async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                try {
                    const idToken = await getIdToken();
                    setToken(idToken);

                    if (idToken) {
                        // Verify token with our backend & get/create user
                        const apiUser = await api.verifyToken(idToken);
                        setUser(apiUser);
                    }
                } catch (error) {
                    console.error('Auth verification failed:', error);
                    setUser(null);
                    setToken(null);
                }
            } else {
                setUser(null);
                setToken(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseLogout();
        setUser(null);
        setToken(null);
        setFirebaseUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, token, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
