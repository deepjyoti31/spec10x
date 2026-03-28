'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    // Restore collapse state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        if (stored === 'true') setCollapsed(true);
    }, []);

    // Ctrl+B / Cmd+B keyboard shortcut
    const toggle = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    }, []);

    useEffect(() => {
        function handle(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                toggle();
            }
        }
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [toggle]);

    // Auth guard
    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1117]" />
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-[#0F1117]">
            <Sidebar collapsed={collapsed} onToggle={toggle} />

            {/* Main content — margin tracks sidebar width */}
            <div
                className="flex flex-col flex-1 overflow-hidden transition-[margin-left] duration-300"
                style={{ marginLeft: collapsed ? 64 : 240 }}
            >
                <TopBar />
                <main className="flex-1 overflow-auto flex flex-col min-h-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
