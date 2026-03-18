'use client';

/**
 * Spec10x — Integrations Page (US-05-01-05)
 *
 * Shows available data sources and active connections.
 * Allows users to connect/disconnect providers.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    DataSourceResponse,
    SourceConnectionResponse,
    SourceConnectionStatus,
} from '@/lib/api';
import styles from './integrations.module.css';

// ── Provider visual config ──────────────────────────────

const PROVIDER_CONFIG: Record<string, { icon: string; label: string }> = {
    zendesk: { icon: '🎫', label: 'Zendesk' },
    csv_import: { icon: '📊', label: 'Survey CSV Import' },
    native_upload: { icon: '🎤', label: 'Interview Uploads' },
    fireflies: { icon: '🔥', label: 'Fireflies' },
    intercom: { icon: '💬', label: 'Intercom' },
    mixpanel: { icon: '📈', label: 'Mixpanel' },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
    support: 'Support',
    survey: 'Survey',
    interview: 'Interview',
    analytics: 'Analytics',
};

const CONNECTION_METHOD_LABELS: Record<string, { icon: string; label: string }> = {
    api_token: { icon: '🔑', label: 'API Token' },
    csv_upload: { icon: '📁', label: 'CSV Upload' },
    native_upload: { icon: '⬆️', label: 'File Upload' },
    oauth: { icon: '🔐', label: 'OAuth' },
};

function getStatusStyle(status: SourceConnectionStatus): string {
    const map: Record<SourceConnectionStatus, string> = {
        connected: styles.statusConnected,
        configured: styles.statusConfigured,
        syncing: styles.statusSyncing,
        error: styles.statusError,
        disconnected: styles.statusDisconnected,
        validating: styles.statusValidating,
    };
    return map[status] || '';
}

function getCardTypeStyle(sourceType: string): string {
    const map: Record<string, string> = {
        support: styles.sourceCardSupport,
        survey: styles.sourceCardSurvey,
        interview: styles.sourceCardInterview,
        analytics: styles.sourceCardAnalytics,
    };
    return map[sourceType] || '';
}

function getIconStyle(sourceType: string): string {
    const map: Record<string, string> = {
        support: styles.providerIconSupport,
        survey: styles.providerIconSurvey,
        interview: styles.providerIconInterview,
        analytics: styles.providerIconAnalytics,
    };
    return map[sourceType] || '';
}

function formatLastSynced(dateStr?: string): string {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// ── Integrations Page ───────────────────────────────────

export default function IntegrationsPage() {
    const { token } = useAuth();
    const [dataSources, setDataSources] = useState<DataSourceResponse[]>([]);
    const [connections, setConnections] = useState<SourceConnectionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [sources, conns] = await Promise.all([
                api.listDataSources(token),
                api.listSourceConnections(token),
            ]);
            setDataSources(sources);
            setConnections(conns);
        } catch (err) {
            console.error('Failed to load integrations data', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDisconnect = async (connectionId: string) => {
        if (!token) return;
        setActionLoading(connectionId);
        try {
            await api.disconnectSourceConnection(token, connectionId);
            await fetchData();
        } catch (err) {
            console.error('Failed to disconnect', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Separate active connections from available (unconnected) sources
    const activeConnections = connections.filter(
        (c) => c.status !== 'disconnected'
    );
    const connectedSourceIds = new Set(
        activeConnections.map((c) => c.data_source.id)
    );
    const availableSources = dataSources.filter(
        (ds) => !connectedSourceIds.has(ds.id)
    );

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.loadingSpinner} />
                    Loading integrations…
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Integrations</h1>
                <p className={styles.pageSubtitle}>
                    Connect your tools to bring all your product evidence into one place.
                    Spec10x will pull insights from support tickets, surveys, and interviews automatically.
                </p>
            </div>

            {/* Active Connections */}
            {activeConnections.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        Active Connections
                        <span className={styles.sectionCount}>
                            {activeConnections.length}
                        </span>
                    </h2>
                    <div className={styles.sourceGrid}>
                        {activeConnections.map((conn) => {
                            const provider = PROVIDER_CONFIG[conn.data_source.provider] || {
                                icon: '🔗',
                                label: conn.data_source.display_name,
                            };
                            const method =
                                CONNECTION_METHOD_LABELS[conn.data_source.connection_method];
                            return (
                                <div
                                    key={conn.id}
                                    className={`${styles.sourceCard} ${getCardTypeStyle(conn.data_source.source_type)}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.providerInfo}>
                                            <div
                                                className={`${styles.providerIcon} ${getIconStyle(conn.data_source.source_type)}`}
                                            >
                                                {provider.icon}
                                            </div>
                                            <div>
                                                <div className={styles.providerName}>
                                                    {provider.label}
                                                </div>
                                                <div className={styles.providerType}>
                                                    {SOURCE_TYPE_LABELS[conn.data_source.source_type] ||
                                                        conn.data_source.source_type}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={`${styles.statusBadge} ${getStatusStyle(conn.status)}`}
                                        >
                                            <span className={styles.statusDot} />
                                            {conn.status}
                                        </div>
                                    </div>

                                    <div className={styles.cardBody}>
                                        {method && (
                                            <div className={styles.connectionMethod}>
                                                <span className={styles.connectionMethodIcon}>
                                                    {method.icon}
                                                </span>
                                                {method.label}
                                            </div>
                                        )}
                                        <div className={styles.lastSynced}>
                                            Last synced: {formatLastSynced(conn.last_synced_at)}
                                        </div>
                                        {conn.last_error_summary && (
                                            <div className={styles.errorSummary}>
                                                ⚠️ {conn.last_error_summary}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button className={styles.viewBtn}>View Details</button>
                                        <button
                                            className={styles.disconnectBtn}
                                            onClick={() => handleDisconnect(conn.id)}
                                            disabled={actionLoading === conn.id}
                                        >
                                            {actionLoading === conn.id
                                                ? 'Disconnecting…'
                                                : 'Disconnect'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Available Sources */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Available Sources
                    <span className={styles.sectionCount}>
                        {availableSources.length}
                    </span>
                </h2>

                {availableSources.length === 0 && activeConnections.length > 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>✅</div>
                        <div className={styles.emptyTitle}>All sources connected</div>
                        <p className={styles.emptyText}>
                            You've connected all available data sources. More integrations are coming soon.
                        </p>
                    </div>
                ) : (
                    <div className={styles.sourceGrid}>
                        {availableSources.map((source) => {
                            const provider = PROVIDER_CONFIG[source.provider] || {
                                icon: '🔗',
                                label: source.display_name,
                            };
                            const method =
                                CONNECTION_METHOD_LABELS[source.connection_method];
                            const isNativeUpload =
                                source.connection_method === 'native_upload';

                            return (
                                <div
                                    key={source.id}
                                    className={`${styles.sourceCard} ${getCardTypeStyle(source.source_type)}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.providerInfo}>
                                            <div
                                                className={`${styles.providerIcon} ${getIconStyle(source.source_type)}`}
                                            >
                                                {provider.icon}
                                            </div>
                                            <div>
                                                <div className={styles.providerName}>
                                                    {provider.label}
                                                </div>
                                                <div className={styles.providerType}>
                                                    {SOURCE_TYPE_LABELS[source.source_type] ||
                                                        source.source_type}
                                                </div>
                                            </div>
                                        </div>
                                        {isNativeUpload && (
                                            <span className={styles.comingSoon}>
                                                Built-in
                                            </span>
                                        )}
                                    </div>

                                    <div className={styles.cardBody}>
                                        {method && (
                                            <div className={styles.connectionMethod}>
                                                <span className={styles.connectionMethodIcon}>
                                                    {method.icon}
                                                </span>
                                                {method.label}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.cardActions}>
                                        {isNativeUpload ? (
                                            <button
                                                className={styles.viewBtn}
                                                style={{ flex: 1 }}
                                                onClick={() =>
                                                    (window.location.href = '/dashboard')
                                                }
                                            >
                                                Go to Dashboard
                                            </button>
                                        ) : (
                                            <button className={styles.connectBtn}>
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Coming Soon Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Coming Soon</h2>
                <div className={styles.sourceGrid}>
                    {[
                        { icon: '🔥', name: 'Fireflies', type: 'Interview', method: 'API Token' },
                        { icon: '💬', name: 'Intercom', type: 'Support', method: 'OAuth' },
                        { icon: '📈', name: 'Mixpanel', type: 'Analytics', method: 'API Token' },
                    ].map((item) => (
                        <div
                            key={item.name}
                            className={styles.sourceCard}
                            style={{ opacity: 0.55 }}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.providerInfo}>
                                    <div
                                        className={`${styles.providerIcon} ${styles.providerIconAnalytics}`}
                                    >
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className={styles.providerName}>{item.name}</div>
                                        <div className={styles.providerType}>{item.type}</div>
                                    </div>
                                </div>
                                <span className={styles.comingSoon}>Coming Soon</span>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.connectionMethod}>
                                    <span className={styles.connectionMethodIcon}>🔑</span>
                                    {item.method}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
