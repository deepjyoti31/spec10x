'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    DataSourceResponse,
    SourceConnectionResponse,
    SurveyImportHistoryItem,
} from '@/lib/api';
import styles from './integrations.module.css';
import ConnectModal from '@/components/integrations/ConnectModal';
import ConnectionDetailModal from '@/components/integrations/ConnectionDetailModal';

const PROVIDER_CONFIG: Record<string, { icon: string; label: string }> = {
    zendesk: { icon: 'ZD', label: 'Zendesk' },
    csv_import: { icon: 'CSV', label: 'Survey CSV Import' },
    native_upload: { icon: 'INT', label: 'Interview Uploads' },
    fireflies: { icon: 'FF', label: 'Fireflies' },
    intercom: { icon: 'IC', label: 'Intercom' },
    mixpanel: { icon: 'MP', label: 'Mixpanel' },
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
    support: 'Support',
    survey: 'Survey',
    interview: 'Interview',
    analytics: 'Analytics',
};

const CONNECTION_METHOD_LABELS: Record<string, { icon: string; label: string }> = {
    api_token: { icon: 'KEY', label: 'API Token' },
    csv_upload: { icon: 'CSV', label: 'CSV Upload' },
    native_upload: { icon: 'UP', label: 'File Upload' },
    oauth: { icon: 'OA', label: 'OAuth' },
};

function getStatusStyle(status: string): string {
    const map: Record<string, string> = {
        connected: styles.statusConnected,
        configured: styles.statusConfigured,
        syncing: styles.statusSyncing,
        error: styles.statusError,
        disconnected: styles.statusDisconnected,
        validating: styles.statusValidating,
        running: styles.statusSyncing,
        succeeded: styles.statusConnected,
        failed: styles.statusError,
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

function formatDate(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
}

function renderHistoryCard(item: SurveyImportHistoryItem) {
    return (
        <div key={item.id} className={styles.historyCard}>
            <div className={styles.historyHeader}>
                <div>
                    <div className={styles.historyTitle}>{item.import_name}</div>
                    <div className={styles.historyMeta}>{formatDate(item.started_at)}</div>
                </div>
                <div className={`${styles.statusBadge} ${getStatusStyle(item.status)}`}>
                    <span className={styles.statusDot} />
                    {item.status}
                </div>
            </div>
            <div className={styles.historyStats}>
                <span>{item.records_seen} rows</span>
                <span>{item.records_created} created</span>
                <span>{item.records_updated} updated</span>
            </div>
            {item.error_summary && (
                <div className={styles.errorSummary}>{item.error_summary}</div>
            )}
        </div>
    );
}

export default function IntegrationsPage() {
    const { token } = useAuth();
    const [dataSources, setDataSources] = useState<DataSourceResponse[]>([]);
    const [connections, setConnections] = useState<SourceConnectionResponse[]>([]);
    const [surveyImports, setSurveyImports] = useState<SurveyImportHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [connectingSource, setConnectingSource] = useState<DataSourceResponse | null>(null);
    const [detailConnectionId, setDetailConnectionId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const [sources, conns, importHistory] = await Promise.all([
                api.listDataSources(token),
                api.listSourceConnections(token),
                api.getSurveyImportHistory(token),
            ]);
            setDataSources(sources);
            setConnections(conns);
            setSurveyImports(importHistory.imports);
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

    const activeConnections = connections.filter(
        (connection) =>
            connection.data_source.provider !== 'csv_import' &&
            connection.status !== 'disconnected'
    );

    const connectedSourceIds = new Set(activeConnections.map((connection) => connection.data_source.id));

    const availableSources = dataSources.filter(
        (source) => source.provider === 'csv_import' || !connectedSourceIds.has(source.id)
    );

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.loadingSpinner} />
                    Loading integrations...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Integrations</h1>
                <p className={styles.pageSubtitle}>
                    Connect live providers, inspect sync health, and run repeatable survey imports
                    without turning CSV uploads into a one-time connection slot.
                </p>
                <div className={styles.trustCallout}>
                    <div>
                        <div className={styles.trustTitle}>Trust and permissions</div>
                        <p className={styles.trustText}>
                            Spec10x is positioned as a read-oriented analysis layer. Disconnect
                            stops future syncs, and copied data deletion is separate from upstream
                            provider records.
                        </p>
                    </div>
                    <div className={styles.trustLinks}>
                        <Link href="/trust" className={styles.trustLink}>
                            Read trust overview
                        </Link>
                        <Link href="/privacy" className={styles.trustLinkSecondary}>
                            Privacy and terms
                        </Link>
                    </div>
                </div>
            </div>

            {activeConnections.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        Active Connections
                        <span className={styles.sectionCount}>{activeConnections.length}</span>
                    </h2>
                    <div className={styles.sourceGrid}>
                        {activeConnections.map((connection) => {
                            const provider = PROVIDER_CONFIG[connection.data_source.provider] || {
                                icon: 'SRC',
                                label: connection.data_source.display_name,
                            };
                            const method =
                                CONNECTION_METHOD_LABELS[connection.data_source.connection_method];

                            return (
                                <div
                                    key={connection.id}
                                    className={`${styles.sourceCard} ${getCardTypeStyle(connection.data_source.source_type)}`}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.providerInfo}>
                                            <div className={`${styles.providerIcon} ${getIconStyle(connection.data_source.source_type)}`}>
                                                {provider.icon}
                                            </div>
                                            <div>
                                                <div className={styles.providerName}>{provider.label}</div>
                                                <div className={styles.providerType}>
                                                    {SOURCE_TYPE_LABELS[connection.data_source.source_type] || connection.data_source.source_type}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`${styles.statusBadge} ${getStatusStyle(connection.status)}`}>
                                            <span className={styles.statusDot} />
                                            {connection.status}
                                        </div>
                                    </div>

                                    <div className={styles.cardBody}>
                                        {method && (
                                            <div className={styles.connectionMethod}>
                                                <span className={styles.connectionMethodIcon}>{method.icon}</span>
                                                {method.label}
                                            </div>
                                        )}
                                        <div className={styles.lastSynced}>
                                            Last synced: {formatLastSynced(connection.last_synced_at)}
                                        </div>
                                        <div className={styles.trustSnippet}>
                                            Disconnect stops future syncs. Copied data stays in
                                            Spec10x until deleted separately.
                                        </div>
                                        {connection.last_error_summary && (
                                            <div className={styles.errorSummary}>{connection.last_error_summary}</div>
                                        )}
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.viewBtn}
                                            onClick={() => setDetailConnectionId(connection.id)}
                                        >
                                            View Details
                                        </button>
                                        <button
                                            className={styles.disconnectBtn}
                                            onClick={() => handleDisconnect(connection.id)}
                                            disabled={actionLoading === connection.id}
                                        >
                                            {actionLoading === connection.id ? 'Disconnecting...' : 'Disconnect'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Survey CSV Imports
                    <span className={styles.sectionCount}>{surveyImports.length}</span>
                </h2>
                {surveyImports.length > 0 ? (
                    <div className={styles.historyList}>{surveyImports.slice(0, 8).map(renderHistoryCard)}</div>
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyTitle}>No survey imports yet</div>
                        <p className={styles.emptyText}>
                            Upload a survey or NPS CSV from the available sources section to start building survey evidence history.
                        </p>
                    </div>
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Available Sources
                    <span className={styles.sectionCount}>{availableSources.length}</span>
                </h2>

                <div className={styles.sourceGrid}>
                    {availableSources.map((source) => {
                        const provider = PROVIDER_CONFIG[source.provider] || {
                            icon: 'SRC',
                            label: source.display_name,
                        };
                        const method = CONNECTION_METHOD_LABELS[source.connection_method];
                        const isNativeUpload = source.connection_method === 'native_upload';
                        const isSurveyImport = source.provider === 'csv_import';

                        return (
                            <div
                                key={source.id}
                                className={`${styles.sourceCard} ${getCardTypeStyle(source.source_type)}`}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.providerInfo}>
                                        <div className={`${styles.providerIcon} ${getIconStyle(source.source_type)}`}>
                                            {provider.icon}
                                        </div>
                                        <div>
                                            <div className={styles.providerName}>{provider.label}</div>
                                            <div className={styles.providerType}>
                                                {SOURCE_TYPE_LABELS[source.source_type] || source.source_type}
                                            </div>
                                        </div>
                                    </div>
                                    {isNativeUpload && (
                                        <span className={styles.comingSoon}>Built-in</span>
                                    )}
                                    {isSurveyImport && (
                                        <span className={styles.comingSoon}>Repeatable</span>
                                    )}
                                </div>

                                <div className={styles.cardBody}>
                                    {method && (
                                        <div className={styles.connectionMethod}>
                                            <span className={styles.connectionMethodIcon}>{method.icon}</span>
                                            {method.label}
                                        </div>
                                    )}
                                    {isSurveyImport && (
                                        <div className={styles.cardCaption}>
                                            Validate and import survey evidence as often as needed. Each upload keeps its own history entry.
                                        </div>
                                    )}
                                    {!isNativeUpload && (
                                        <div className={styles.trustSnippet}>
                                            Read-oriented access where possible. Connection secrets
                                            are not returned in API responses, and disconnect stops
                                            future syncs.
                                        </div>
                                    )}
                                </div>

                                <div className={styles.cardActions}>
                                    {isNativeUpload ? (
                                        <button
                                            className={styles.viewBtn}
                                            style={{ flex: 1 }}
                                            onClick={() => (window.location.href = '/dashboard')}
                                        >
                                            Go to Dashboard
                                        </button>
                                    ) : (
                                        <button
                                            className={styles.connectBtn}
                                            onClick={() => setConnectingSource(source)}
                                        >
                                            {isSurveyImport ? 'Import CSV' : 'Connect'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Coming Soon</h2>
                <div className={styles.sourceGrid}>
                    {[
                        { icon: 'FF', name: 'Fireflies', type: 'Interview', method: 'API Token' },
                        { icon: 'IC', name: 'Intercom', type: 'Support', method: 'OAuth' },
                        { icon: 'MP', name: 'Mixpanel', type: 'Analytics', method: 'API Token' },
                    ].map((item) => (
                        <div key={item.name} className={styles.sourceCard} style={{ opacity: 0.55 }}>
                            <div className={styles.cardHeader}>
                                <div className={styles.providerInfo}>
                                    <div className={`${styles.providerIcon} ${styles.providerIconAnalytics}`}>
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
                                    <span className={styles.connectionMethodIcon}>KEY</span>
                                    {item.method}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {connectingSource && (
                <ConnectModal
                    source={connectingSource}
                    onClose={() => setConnectingSource(null)}
                    onConnected={() => {
                        setConnectingSource(null);
                        fetchData();
                    }}
                />
            )}

            {detailConnectionId && (
                <ConnectionDetailModal
                    connectionId={detailConnectionId}
                    onClose={() => setDetailConnectionId(null)}
                    onUpdated={fetchData}
                />
            )}
        </div>
    );
}
