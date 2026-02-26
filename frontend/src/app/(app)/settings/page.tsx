'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './settings.module.css';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { LimitsResponse } from '@/lib/api';

export default function SettingsPage() {
    const { user, token } = useAuth();
    const [limits, setLimits] = useState<LimitsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        const fetchLimits = async () => {
            try {
                const data = await api.getLimits(token);
                setLimits(data);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        };
        fetchLimits();
    }, [token]);

    const handleExport = useCallback(async () => {
        if (!token) return;
        try {
            const markdown = await api.exportInsights(token);
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spec10x-insights-export.md';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // silently fail
        }
    }, [token]);

    const planLabel = (plan: string) => {
        switch (plan) {
            case 'pro': return '💎 Pro';
            case 'business': return '🚀 Business';
            default: return '🆓 Free';
        }
    };

    const planBadgeClass = (plan: string) => {
        switch (plan) {
            case 'pro': return styles.planPro;
            case 'business': return styles.planBusiness;
            default: return styles.planFree;
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Settings</h1>

            {/* Profile Section */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Profile</h2>
                <div className={styles.profileCard}>
                    <div className={styles.avatar}>
                        {(user?.name || user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className={styles.profileInfo}>
                        <h3 className={styles.profileName}>{user?.name || 'User'}</h3>
                        <p className={styles.profileEmail}>{user?.email || ''}</p>
                    </div>
                    <span className={`${styles.planBadge} ${planBadgeClass(user?.plan || 'free')}`}>
                        {user?.plan || 'free'}
                    </span>
                </div>
            </div>

            {/* Billing Section */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Billing & Usage</h2>
                {loading ? (
                    <div className={styles.loading}>Loading usage data…</div>
                ) : limits ? (
                    <div className={styles.billingCard}>
                        <div className={styles.planRow}>
                            <span className={styles.currentPlan}>{planLabel(limits.plan)}</span>
                            {limits.plan === 'free' && (
                                <button className={styles.upgradeBtn}>Upgrade to Pro</button>
                            )}
                        </div>
                        <div className={styles.usageBars}>
                            <UsageBar
                                label="Interviews"
                                used={limits.usage.interviews_uploaded}
                                limit={limits.limits.interviews_per_month}
                                unit="/mo"
                            />
                            <UsageBar
                                label="AI Q&A Queries"
                                used={limits.usage.qa_queries_used}
                                limit={limits.limits.qa_queries_per_month}
                                unit="/mo"
                            />
                            <UsageBar
                                label="Storage"
                                used={limits.usage.storage_bytes_used}
                                limit={limits.limits.storage_bytes}
                                format={formatBytes}
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Data Export */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Data Export</h2>
                <div className={styles.exportCard}>
                    <span className={styles.exportText}>
                        Export all insights and themes as Markdown
                    </span>
                    <button className={styles.exportBtn} onClick={handleExport}>
                        Export ↓
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Danger Zone</h2>
                <div className={styles.dangerCard}>
                    <div className={styles.dangerRow}>
                        <div className={styles.dangerText}>
                            <h4>Delete all data</h4>
                            <p>Permanently remove all interviews, insights, and themes</p>
                        </div>
                        <button className={styles.dangerBtn}>Delete All Data</button>
                    </div>
                    <div className={styles.dangerRow}>
                        <div className={styles.dangerText}>
                            <h4>Delete account</h4>
                            <p>Permanently delete your account and all associated data</p>
                        </div>
                        <button className={styles.dangerBtn}>Delete Account</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Usage bar sub-component ---

function UsageBar({
    label,
    used,
    limit,
    unit = '',
    format,
}: {
    label: string;
    used: number;
    limit: number;
    unit?: string;
    format?: (n: number) => string;
}) {
    const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const displayUsed = format ? format(used) : used;
    const displayLimit = format ? format(limit) : limit;

    let fillClass = styles.usageFill;
    if (percentage > 90) fillClass += ` ${styles.usageFillDanger}`;
    else if (percentage > 70) fillClass += ` ${styles.usageFillWarning}`;

    return (
        <div className={styles.usageItem}>
            <div className={styles.usageLabel}>
                <span className={styles.usageName}>{label}</span>
                <span className={styles.usageValue}>
                    {displayUsed} / {displayLimit}{unit}
                </span>
            </div>
            <div className={styles.usageTrack}>
                <div className={fillClass} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
