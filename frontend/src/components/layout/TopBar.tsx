'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api, NotificationResponse } from '@/lib/api';

// ---------------------------------------------------------------------------
// Route → display name map
// ---------------------------------------------------------------------------

const PAGE_NAMES: Record<string, string> = {
    '/home':         'Home',
    '/insights':     'Insights',
    '/interviews':   'Interviews',
    '/feed':         'Feed',
    '/integrations': 'Integrations',
    '/board':        'Board',
    '/ask':          'Ask AI',
    '/settings':     'Settings',
    '/trends':       'Trends',
    '/specs':        'Specs',
    '/wireframes':   'Wireframes',
    '/tasks':        'Tasks',
    '/roadmap':      'Roadmap',
    '/outcomes':     'Outcomes',
    '/team':         'Team',
};

function getPageName(pathname: string): string {
    if (pathname.startsWith('/interview/')) return 'Interviews';
    return PAGE_NAMES[pathname] ?? '';
}

function getSubContext(pathname: string): string | null {
    if (pathname.startsWith('/interview/')) return 'Interview Detail';
    return null;
}

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

interface TopBarProps {
    onSearchClick?: () => void;
}

export default function TopBar({ onSearchClick }: TopBarProps) {
    const pathname = usePathname();
    const { token } = useAuth();
    const pageName = getPageName(pathname);
    const subContext = getSubContext(pathname);

    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    useEffect(() => {
        if (!token) return;
        api.getNotifications(token)
            .then(setNotifications)
            .catch(() => {});
    }, [token]);

    // Close on outside click
    useEffect(() => {
        function handle(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifs(false);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const handleNotifClick = async (notif: NotificationResponse) => {
        if (!notif.is_read && token) {
            try {
                await api.markNotificationRead(token, notif.id);
                setNotifications(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
                );
            } catch {}
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <header className="flex items-center justify-between px-8 h-[48px] bg-transparent border-b border-white/[0.06] sticky top-0 z-40 backdrop-blur-md flex-shrink-0">

            {/* ── Left: Breadcrumbs ── */}
            <div className="flex items-center gap-2">
                {subContext ? (
                    <>
                        <span className="text-[13px] text-[#8B8D97]">{pageName}</span>
                        <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 14 }}>
                            chevron_right
                        </span>
                        <span className="text-[13px] font-medium text-[#F0F0F3]">{subContext}</span>
                    </>
                ) : (
                    <span className="text-[13px] font-medium text-[#F0F0F3]">{pageName}</span>
                )}
            </div>

            {/* ── Right: Search + Notifications ── */}
            <div className="flex items-center gap-3">

                {/* Search pill */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D97] pointer-events-none" style={{ fontSize: 18 }}>
                        search
                    </span>
                    <input
                        type="text"
                        readOnly
                        placeholder="Search…"
                        onClick={onSearchClick}
                        className="bg-[#161820] border border-[#1E2028] rounded-full h-8 pl-9 pr-12 text-[13px] text-[#F0F0F3] placeholder:text-[#5A5C66] w-64 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#afc6ff]/40 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#5A5C66] pointer-events-none">
                        ⌘K
                    </span>
                </div>

                {/* Notification bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifs(v => !v)}
                        className="relative p-1.5 text-[#8B8D97] hover:text-[#F0F0F3] transition-colors rounded-md hover:bg-white/[0.04]"
                        aria-label="Notifications"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-[#afc6ff] rounded-full border-2 border-[#0F1117]" />
                        )}
                    </button>

                    {showNotifs && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1C1E28] border border-[#2A2C38] rounded-lg shadow-xl z-50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2028]">
                                <span className="text-[14px] font-semibold text-[#F0F0F3]">Notifications</span>
                                {unreadCount > 0 && (
                                    <span className="text-[11px] font-bold bg-[#afc6ff]/10 text-[#afc6ff] px-2 py-0.5 rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-[13px] text-[#5A5C66]">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotifClick(notif)}
                                            className={`px-4 py-3 cursor-pointer border-b border-[#1E2028] last:border-0 hover:bg-white/[0.02] transition-colors ${!notif.is_read ? 'bg-[#afc6ff]/[0.04]' : ''}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {!notif.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#afc6ff] mt-1.5 flex-shrink-0" />
                                                )}
                                                <div className={!notif.is_read ? '' : 'pl-3.5'}>
                                                    <div className="text-[13px] font-medium text-[#F0F0F3] leading-snug">
                                                        {notif.title}
                                                    </div>
                                                    <div className="text-[12px] text-[#8B8D97] mt-0.5">
                                                        {notif.message}
                                                    </div>
                                                    <div className="text-[11px] text-[#5A5C66] mt-1">
                                                        {new Date(notif.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}
