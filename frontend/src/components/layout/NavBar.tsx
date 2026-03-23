'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Input from '@/components/ui/Input';
import Tooltip from '@/components/ui/Tooltip';
import { api, NotificationResponse } from '@/lib/api';
import styles from './NavBar.module.css';

interface NavBarProps {
    onSearchClick?: () => void;
}

export default function NavBar({ onSearchClick }: NavBarProps = {}) {
    const { user, token, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Notifications state
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    useEffect(() => {
        if (!token) return;
        const fetchNotifications = async () => {
            try {
                const data = await api.getNotifications(token);
                setNotifications(data);
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            }
        };
        fetchNotifications();
    }, [token]);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notif: NotificationResponse) => {
        if (!notif.is_read && token) {
            try {
                await api.markNotificationRead(token, notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            } catch (err) {
                console.error("Failed to mark notification as read", err);
            }
        }
    };

    const isDashboard = pathname === '/dashboard' || pathname.startsWith('/interview/');
    const isBoard = pathname === '/board';
    const isAsk = pathname === '/ask';
    const isFeed = pathname === '/feed';
    const isIntegrations = pathname === '/integrations';

    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <nav className={styles.nav}>
            {/* Logo */}
            <a href="/dashboard" className={styles.logo}>
                <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x Logo" className={styles.navLogo} />
                <span>Spec10x</span>
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
                    href="/board"
                    className={`${styles.navLink} ${isBoard ? styles.navLinkActive : ''}`}
                >
                    Board
                </a>
                <a
                    href="/ask"
                    className={`${styles.navLink} ${isAsk ? styles.navLinkActive : ''}`}
                >
                    Ask
                </a>
                <a
                    href="/feed"
                    className={`${styles.navLink} ${isFeed ? styles.navLinkActive : ''}`}
                >
                    Feed
                </a>
                <a
                    href="/integrations"
                    className={`${styles.navLink} ${isIntegrations ? styles.navLinkActive : ''}`}
                >
                    Integrations
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
                <div className={styles.notificationWrapper} ref={notifDropdownRef}>
                    <button
                        className={styles.iconButton}
                        aria-label="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        🔔
                        {notifications.some(n => !n.is_read) && (
                            <div className={styles.notificationBadge} />
                        )}
                    </button>
                    {showNotifications && (
                        <div className={styles.notificationDropdown}>
                            <div className={styles.notificationHeader}>
                                Notifications
                            </div>
                            <div className={styles.notificationList}>
                                {notifications.length === 0 ? (
                                    <div className={styles.emptyNotifications}>
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`${styles.notificationItem} ${!notif.is_read ? styles.notificationItemUnread : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className={styles.notificationTitle}>{notif.title}</div>
                                            <div className={styles.notificationMessage}>{notif.message}</div>
                                            <div className={styles.notificationTime}>
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
