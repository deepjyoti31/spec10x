'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Nav config — single source of truth for all sidebar links
// ---------------------------------------------------------------------------

interface NavItem {
    label: string;
    icon: string;
    href: string;
    locked?: boolean;
}

interface NavSection {
    title?: string;       // undefined = no section label (used for Home)
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        items: [
            { label: 'Home', icon: 'home', href: '/home' },
        ],
    },
    {
        title: 'Discover',
        items: [
            { label: 'Insights',     icon: 'lightbulb',   href: '/insights' },
            { label: 'Interviews',   icon: 'folder_open', href: '/interviews' },
            { label: 'Feed',         icon: 'inbox',       href: '/feed' },
            { label: 'Integrations', icon: 'cable',       href: '/integrations' },
        ],
    },
    {
        title: 'Analyze',
        items: [
            { label: 'Board',  icon: 'view_kanban',  href: '/board' },
            { label: 'Ask AI', icon: 'chat',         href: '/ask' },
            { label: 'Trends', icon: 'trending_up',  href: '/trends', locked: true },
        ],
    },
    {
        title: 'Specify',
        items: [
            { label: 'Specs',      icon: 'description',        href: '/specs',      locked: true },
            { label: 'Wireframes', icon: 'dashboard_customize', href: '/wireframes', locked: true },
        ],
    },
    {
        title: 'Deliver',
        items: [
            { label: 'Tasks',   icon: 'task_alt', href: '/tasks',   locked: true },
            { label: 'Roadmap', icon: 'map',      href: '/roadmap', locked: true },
        ],
    },
    {
        title: 'Learn',
        items: [
            { label: 'Outcomes', icon: 'monitoring', href: '/outcomes', locked: true },
        ],
    },
];

const WORKSPACE_ITEMS: NavItem[] = [
    { label: 'Team',     icon: 'group',    href: '/team' },
    { label: 'Settings', icon: 'settings', href: '/settings' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name?: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function useIsActive(href: string): boolean {
    const pathname = usePathname();
    // /interview/[id] activates Interviews in the sidebar
    if (href === '/interviews' && pathname.startsWith('/interview/')) return true;
    return pathname === href || pathname.startsWith(href + '/');
}

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

function NavItemRow({
    item,
    collapsed,
}: {
    item: NavItem;
    collapsed: boolean;
}) {
    const active = useIsActive(item.href);

    const className = [
        'nav-item',
        active      ? 'nav-item--active'   : '',
        item.locked ? 'nav-item--locked'   : '',
        collapsed   ? 'nav-item--collapsed': '',
    ].filter(Boolean).join(' ');

    return (
        <div className="relative group/tooltip">
            <Link href={item.href} className={className}>
                {item.locked ? (
                    <>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                {item.icon}
                            </span>
                            {!collapsed && (
                                <span className={`text-[14px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                            )}
                        </div>
                        {!collapsed && (
                            <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 12 }}>
                                lock
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                            {item.icon}
                        </span>
                        {!collapsed && (
                            <span className={`text-[14px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                        )}
                    </>
                )}
            </Link>

            {/* Tooltip — only in collapsed mode */}
            {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200] opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1E2028] border border-[#2A2C38] rounded-[6px] whitespace-nowrap shadow-lg">
                        <span className="text-[13px] font-medium text-[#F0F0F3]">{item.label}</span>
                        {item.locked && (
                            <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 11 }}>lock</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

function SectionLabel({ title }: { title: string }) {
    return (
        <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] text-[#5A5C66] font-semibold uppercase tracking-[0.05em]">
                {title}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user menu on outside click
    useEffect(() => {
        function handle(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const width = collapsed ? 64 : 240;

    return (
        <aside
            className="fixed left-0 top-0 h-screen flex flex-col bg-[#0C0E14] z-50 transition-[width] duration-300 overflow-hidden"
            style={{ width }}
        >
            <div className="flex flex-col h-full py-4 px-3">

                {/* ── Logo row ── */}
                <div
                    className="flex items-center justify-between px-3 py-4 mb-2"
                    style={collapsed ? { justifyContent: 'center' } : {}}
                >
                    {!collapsed && (
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-[#4F8CFF] flex items-center justify-center shadow-lg shadow-[#4F8CFF]/20">
                                <span
                                    className="material-symbols-outlined text-white"
                                    style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                                >
                                    category
                                </span>
                            </div>
                            <h1 className="text-[16px] font-bold text-[#F0F0F3] leading-none whitespace-nowrap">
                                Spec10x
                            </h1>
                        </div>
                    )}

                    {collapsed ? (
                        /* Collapsed: show logo icon centered, clicking expands */
                        <button
                            onClick={onToggle}
                            className="w-8 h-8 rounded-lg bg-[#4F8CFF] flex items-center justify-center shadow-lg shadow-[#4F8CFF]/20 hover:brightness-110 transition-all"
                            aria-label="Expand sidebar"
                        >
                            <span
                                className="material-symbols-outlined text-white"
                                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                            >
                                category
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={onToggle}
                            className="text-[#5A5C66] hover:text-[#F0F0F3] transition-colors"
                            aria-label="Collapse sidebar"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                chevron_left
                            </span>
                        </button>
                    )}
                </div>

                {/* ── Main nav ── */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5">
                    {NAV_SECTIONS.map((section, si) => (
                        <div key={si}>
                            {section.title && !collapsed && (
                                <SectionLabel title={section.title} />
                            )}
                            {section.title && collapsed && (
                                /* Small spacer to preserve visual rhythm when collapsed */
                                <div className="pt-3" />
                            )}
                            {section.items.map(item => (
                                <NavItemRow key={item.href} item={item} collapsed={collapsed} />
                            ))}
                        </div>
                    ))}

                    {/* ── Separator ── */}
                    <div className="my-4 h-[1px] bg-[#1E2028] mx-3" />

                    {/* ── Workspace ── */}
                    {!collapsed && (
                        <div className="pb-1 px-3">
                            <span className="text-[11px] text-[#5A5C66] font-semibold uppercase tracking-[0.05em]">
                                Workspace
                            </span>
                        </div>
                    )}
                    {collapsed && <div className="pt-1" />}
                    {WORKSPACE_ITEMS.map(item => (
                        <NavItemRow key={item.href} item={item} collapsed={collapsed} />
                    ))}
                </nav>

                {/* ── Bottom pin ── */}
                <div className="mt-auto pt-4 border-t border-[#1E2028] space-y-2">
                    {/* Help & Feedback */}
                    <div className="relative group/tooltip">
                        <a
                            href="#"
                            className="flex items-center gap-3 px-3 py-1.5 text-[#5A5C66] hover:text-[#F0F0F3] transition-colors"
                            style={collapsed ? { justifyContent: 'center' } : {}}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help_outline</span>
                            {!collapsed && (
                                <span className="text-[13px] font-medium">Help &amp; Feedback</span>
                            )}
                        </a>
                        {collapsed && (
                            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200] opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150">
                                <div className="px-2.5 py-1.5 bg-[#1E2028] border border-[#2A2C38] rounded-[6px] whitespace-nowrap shadow-lg">
                                    <span className="text-[13px] font-medium text-[#F0F0F3]">Help &amp; Feedback</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User row */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(v => !v)}
                            className={`w-full flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg border border-white/[0.05] hover:bg-white/[0.06] transition-all ${collapsed ? 'justify-center' : ''}`}
                        >
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#4F8CFF] flex items-center justify-center text-white text-[12px] font-bold">
                                {getInitials(user?.name)}
                            </div>
                            {!collapsed && (
                                <>
                                    <div className="flex flex-col min-w-0 flex-1 text-left">
                                        <span className="text-[14px] font-semibold text-[#F0F0F3] truncate leading-tight">
                                            {user?.name ?? 'User'}
                                        </span>
                                        <span className="text-[12px] text-[#5A5C66] leading-tight">
                                            Pro Plan
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-[#5A5C66] flex-shrink-0" style={{ fontSize: 18 }}>
                                        unfold_more
                                    </span>
                                </>
                            )}
                        </button>

                        {/* User flyout menu */}
                        {showUserMenu && (
                            <div
                                className="absolute bottom-full mb-2 bg-[#1C1E28] border border-[#2A2C38] rounded-lg shadow-xl z-[200] py-1 overflow-hidden"
                                style={collapsed ? { left: '100%', bottom: 0, marginLeft: 8, marginBottom: 0 } : { left: 0, right: 0 }}
                            >
                                <div className="px-4 py-3 border-b border-[#1E2028]">
                                    <div className="text-[14px] font-medium text-[#F0F0F3]">{user?.name ?? 'User'}</div>
                                    <div className="text-[12px] text-[#8B8D97]">{user?.email}</div>
                                </div>
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#B0B2BA] hover:text-[#F0F0F3] hover:bg-white/[0.04] transition-colors text-left"
                                    onClick={() => { router.push('/settings'); setShowUserMenu(false); }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
                                    Settings
                                </button>
                                <div className="h-[1px] bg-[#1E2028] mx-2 my-1" />
                                <button
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#F87171] hover:bg-[#F87171]/[0.06] transition-colors text-left"
                                    onClick={() => { logout(); setShowUserMenu(false); }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </aside>
    );
}
