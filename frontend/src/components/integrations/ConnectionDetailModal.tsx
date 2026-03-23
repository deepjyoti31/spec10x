'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, SourceConnectionDetailResponse } from '@/lib/api';
import styles from './ConnectionDetailModal.module.css';

interface ConnectionDetailModalProps {
    connectionId: string;
    onClose: () => void;
    onUpdated: () => Promise<void> | void;
}

function formatDate(value?: string) {
    if (!value) return 'Not available';
    return new Date(value).toLocaleString();
}

export default function ConnectionDetailModal({
    connectionId,
    onClose,
    onUpdated,
}: ConnectionDetailModalProps) {
    const { token } = useAuth();
    const [detail, setDetail] = useState<SourceConnectionDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<'sync' | 'backfill' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDetail = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getSourceConnection(token, connectionId);
            setDetail(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load connection detail');
        } finally {
            setLoading(false);
        }
    }, [connectionId, token]);

    useEffect(() => {
        loadDetail();
    }, [loadDetail]);

    const handleAction = async (action: 'sync' | 'backfill') => {
        if (!token) return;
        setActionLoading(action);
        setError(null);
        try {
            if (action === 'sync') {
                await api.triggerSourceConnectionSync(token, connectionId);
            } else {
                await api.triggerSourceConnectionBackfill(token, connectionId);
            }
            await loadDetail();
            await onUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const canRunActions =
        detail?.status === 'connected' || detail?.status === 'error';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.eyebrow}>Connection Detail</div>
                        <h3 className={styles.title}>
                            {detail?.data_source.display_name || 'Integration'}
                        </h3>
                        <p className={styles.subtitle}>
                            Inspect recent runs, connection health, and trigger manual sync actions.
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        x
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading connection detail...</div>
                ) : detail ? (
                    <>
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}>
                                <span className={styles.summaryLabel}>Status</span>
                                <span className={styles.summaryValue}>{detail.status}</span>
                            </div>
                            <div className={styles.summaryCard}>
                                <span className={styles.summaryLabel}>Last Sync</span>
                                <span className={styles.summaryValue}>{formatDate(detail.last_synced_at)}</span>
                            </div>
                            <div className={styles.summaryCard}>
                                <span className={styles.summaryLabel}>Last Error</span>
                                <span className={styles.summaryValue}>{detail.last_error_summary || 'None'}</span>
                            </div>
                        </div>

                        <div className={styles.actionRow}>
                            <button
                                className={styles.primaryButton}
                                onClick={() => handleAction('sync')}
                                disabled={!canRunActions || actionLoading !== null}
                            >
                                {actionLoading === 'sync' ? 'Running sync...' : 'Run Manual Sync'}
                            </button>
                            <button
                                className={styles.secondaryButton}
                                onClick={() => handleAction('backfill')}
                                disabled={!canRunActions || actionLoading !== null}
                            >
                                {actionLoading === 'backfill' ? 'Running backfill...' : 'Run Backfill'}
                            </button>
                        </div>

                        {!canRunActions && (
                            <div className={styles.helperText}>
                                This connection must be in the connected or error state before manual sync actions can run.
                            </div>
                        )}

                        <div className={styles.trustNote}>
                            Disconnect stops future syncs for this connection. It does not delete
                            upstream provider records, and copied data in Spec10x is deleted
                            separately.
                            <a href="/trust" className={styles.trustLink}>
                                Read the trust overview
                            </a>
                        </div>

                        {error && <div className={styles.errorBox}>{error}</div>}

                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Recent Sync Runs</div>
                            {detail.sync_runs.length === 0 ? (
                                <div className={styles.emptyRuns}>No sync runs recorded yet.</div>
                            ) : (
                                <div className={styles.runList}>
                                    {detail.sync_runs.slice(0, 8).map((run) => (
                                        <div key={run.id} className={styles.runCard}>
                                            <div className={styles.runHeader}>
                                                <span className={styles.runType}>{run.run_type}</span>
                                                <span className={styles.runStatus}>{run.status}</span>
                                            </div>
                                            <div className={styles.runMeta}>
                                                <span>Started {formatDate(run.started_at)}</span>
                                                <span>Finished {formatDate(run.finished_at)}</span>
                                            </div>
                                            <div className={styles.runStats}>
                                                <span>{run.records_seen} seen</span>
                                                <span>{run.records_created} created</span>
                                                <span>{run.records_updated} updated</span>
                                            </div>
                                            {run.error_summary && (
                                                <div className={styles.runError}>{run.error_summary}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.loading}>{error || 'Connection detail unavailable.'}</div>
                )}
            </div>
        </div>
    );
}
