/**
 * Spec10x — Dashboard Page (placeholder)
 * Full implementation in Day 3 (Frontend Core)
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { user, loading, logout } = useAuth();
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
                Loading...
            </div>
        );
    }

    if (!user) return null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-page)',
            gap: '16px',
        }}>
            <h1 style={{ color: 'var(--color-accent)', fontSize: '28px' }}>
                🎉 Spec10x Dashboard
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
                Welcome, <strong style={{ color: 'var(--color-text-primary)' }}>{user.name}</strong>!
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                Plan: {user.plan} · Full dashboard coming in Day 3
            </p>
            <button
                onClick={logout}
                style={{
                    marginTop: '16px',
                    padding: '8px 24px',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                }}
            >
                Sign Out
            </button>
        </div>
    );
}
