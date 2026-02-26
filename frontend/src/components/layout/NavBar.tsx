'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Tooltip from '@/components/ui/Tooltip';
import styles from './NavBar.module.css';

interface NavBarProps {
    onSearchClick?: () => void;
}

export default function NavBar({ onSearchClick }: NavBarProps = {}) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isDashboard = pathname === '/dashboard' || pathname.startsWith('/interview/');
    const isAsk = pathname === '/ask';

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <nav className={styles.nav}>
            {/* Logo */}
            <a href="/dashboard" className={styles.logo}>
                <span className={styles.logoAccent}>Spec</span>10x
            </a>

            {/* Navigation Links */}
            <div className={styles.navLinks}>
                <a
                    href="/dashboard"
                    className={`${styles.navLink} ${isDashboard ? styles.navLinkActive : ''}`}
                >
                    Dashboard
                </a>
                <a
                    href="/ask"
                    className={`${styles.navLink} ${isAsk ? styles.navLinkActive : ''}`}
                >
                    Ask ✨
                </a>
            </div>

            {/* Search Bar */}
            <div className={styles.searchWrapper}>
                <Input
                    variant="search"
                    placeholder="Search interviews, themes…"
                    suffix="⌘K"
                    readOnly
                    onClick={() => onSearchClick?.()}
                    style={{ cursor: 'pointer' }}
                />
            </div>

            {/* Right Side Actions */}
            <div className={styles.actions}>
                {/* Notification Bell */}
                <Tooltip content="Coming soon">
                    <button className={styles.iconButton} aria-label="Notifications">
                        🔔
                    </button>
                </Tooltip>

                {/* Settings */}
                <button
                    className={styles.iconButton}
                    onClick={() => router.push('/settings')}
                    aria-label="Settings"
                >
                    ⚙️
                </button>

                {/* User Avatar + Dropdown */}
                <div className={styles.userMenu} ref={dropdownRef}>
                    <div
                        className={styles.avatar}
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        {initials}
                    </div>

                    {showDropdown && (
                        <div className={styles.dropdown}>
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', marginBottom: '4px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                    {user?.name || 'User'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    {user?.email}
                                </div>
                            </div>
                            <button
                                className={styles.dropdownItem}
                                onClick={() => { router.push('/settings'); setShowDropdown(false); }}
                            >
                                ⚙️ Settings
                            </button>
                            <div className={styles.dropdownDivider} />
                            <button
                                className={`${styles.dropdownItem} ${styles.dangerItem}`}
                                onClick={() => { logout(); setShowDropdown(false); }}
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
