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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
