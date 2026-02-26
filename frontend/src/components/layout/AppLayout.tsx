'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import NavBar from './NavBar';
import CommandPalette from './CommandPalette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Global Ctrl+K / Cmd+K listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen((prev) => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const openPalette = useCallback(() => setPaletteOpen(true), []);
    const closePalette = useCallback(() => setPaletteOpen(false), []);

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
            <NavBar onSearchClick={openPalette} />
            <main style={{ height: 'calc(100vh - var(--nav-height))' }}>
                {children}
            </main>
            <CommandPalette isOpen={paletteOpen} onClose={closePalette} />
        </div>
    );
}
