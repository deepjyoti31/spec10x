'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import NavBar from './NavBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-page)',
                color: 'var(--color-text-secondary)',
            }}>
                Loading…
            </div>
        );
    }

    if (!user) return null;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-page)' }}>
            <NavBar />
            <main style={{ height: 'calc(100vh - var(--nav-height))' }}>
                {children}
            </main>
        </div>
    );
}
