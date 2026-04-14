'use client';

import { useEffect } from 'react';

import ConnectModal from './ConnectModal';
import { formatRelativeTime, useIntegrations } from '@/hooks/useIntegrations';
import { useToast } from '@/components/ui/Toast';
import { SourceConnectionResponse } from '@/lib/api';

// ---------------------------------------------------------------------------
// Static display metadata
// ---------------------------------------------------------------------------

const PROVIDER_DISPLAY: Record<string, { iconBg: string; icon: string; description: string }> = {
    zendesk: {
        iconBg: 'rgba(3,54,61,0.8)',
        icon: 'support',
        description: 'Support tickets and customer conversations',
    },
    fireflies: {
        iconBg: 'rgba(83,64,255,0.3)',
        icon: 'mic',
        description: 'Meeting recordings and AI transcriptions',
    },
    intercom: {
        iconBg: 'rgba(80,114,231,0.3)',
        icon: 'forum',
        description: 'Real-time messaging for customer support',
    },
    hubspot: {
        iconBg: 'rgba(255,122,89,0.3)',
        icon: 'person',
        description: 'Sync customer profiles and sales activities',
    },
    jira: {
        iconBg: 'rgba(0,82,204,0.3)',
        icon: 'task',
        description: 'Connect engineering issues to customer feedback',
    },
    csv_import: {
        iconBg: 'rgba(52,211,153,0.15)',
        icon: 'upload_file',
        description: 'Import survey responses and NPS scores from CSV',
    },
};

// ---------------------------------------------------------------------------
// Category definitions — the source of truth for the grid layout
// ---------------------------------------------------------------------------

const CATEGORIES = [
    {
        id: 'interviews',
        label: 'Interview Sources',
        items: [
            {
                id: 'fireflies',
                name: 'Fireflies',
                description: 'Meeting recordings and AI transcriptions.',
                iconBg: 'rgba(83,64,255,0.2)',
                iconColor: '#7B6FFF',
                icon: 'mic',
                available: false,
            },
            {
                id: 'otter',
                name: 'Otter.ai',
                description: 'AI-powered meeting transcription and notes.',
                iconBg: 'rgba(0,145,235,0.15)',
                iconColor: '#0091EB',
                icon: 'record_voice_over',
                available: false,
            },
            {
                id: 'grain',
                name: 'Grain',
                description: 'Record, transcribe and share video highlights.',
                iconBg: 'rgba(107,70,193,0.15)',
                iconColor: '#9B71E8',
                icon: 'videocam',
                available: false,
            },
        ],
    },
    {
        id: 'support',
        label: 'Support Sources',
        items: [
            {
                id: 'zendesk',
                name: 'Zendesk',
                description: 'Support tickets and customer conversations.',
                iconBg: 'rgba(3,54,61,0.6)',
                iconColor: '#03363D',
                icon: 'support',
                available: true,
            },
            {
                id: 'intercom',
                name: 'Intercom',
                description: 'Real-time messaging for customer support and engagement.',
                iconBg: 'rgba(175,198,255,0.2)',
                iconColor: '#afc6ff',
                icon: 'forum',
                available: false,
            },
            {
                id: 'freshdesk',
                name: 'Freshdesk',
                description: 'Cloud-based customer support and helpdesk software.',
                iconBg: 'rgba(18,191,176,0.15)',
                iconColor: '#12BFB0',
                icon: 'headset_mic',
                available: false,
            },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics Sources',
        items: [
            {
                id: 'mixpanel',
                name: 'Mixpanel',
                description: 'Product analytics for user behavior and engagement.',
                iconBg: 'rgba(118,57,232,0.15)',
                iconColor: '#8B5CF6',
                icon: 'pie_chart',
                available: false,
            },
            {
                id: 'amplitude',
                name: 'Amplitude',
                description: 'Digital analytics platform for product teams.',
                iconBg: 'rgba(0,56,255,0.15)',
                iconColor: '#4C6EF5',
                icon: 'show_chart',
                available: false,
            },
            {
                id: 'posthog',
                name: 'PostHog',
                description: 'Open-source product analytics and session recording.',
                iconBg: 'rgba(243,104,57,0.15)',
                iconColor: '#F36839',
                icon: 'hub',
                available: false,
            },
        ],
    },
    {
        id: 'crm',
        label: 'CRM Sources',
        items: [
            {
                id: 'hubspot',
                name: 'HubSpot',
                description: 'Sync customer profiles and sales activities seamlessly.',
                iconBg: 'rgba(255,122,89,0.2)',
                iconColor: '#FF7A59',
                icon: 'person',
                available: false,
            },
            {
                id: 'salesforce',
                name: 'Salesforce',
                description: 'Connect CRM data for a full view of every customer.',
                iconBg: 'rgba(0,161,224,0.15)',
                iconColor: '#00A1E0',
                icon: 'cloud',
                available: false,
            },
        ],
    },
    {
        id: 'import',
        label: 'Import',
        items: [
            {
                id: 'csv_import',
                name: 'CSV Survey / NPS',
                description: 'Import survey responses and NPS scores from CSV files.',
                iconBg: 'rgba(52,211,153,0.15)',
                iconColor: '#34D399',
                icon: 'upload_file',
                available: true,
            },
        ],
    },
    {
        id: 'pm',
        label: 'PM Tool Sync',
        items: [
            {
                id: 'jira',
                name: 'Jira',
                description: 'Connect engineering issues to customer feedback loops.',
                iconBg: 'rgba(0,82,204,0.2)',
                iconColor: '#0052CC',
                icon: 'task',
                available: false,
            },
            {
                id: 'linear',
                name: 'Linear',
                description: 'Modern issue tracking for high-performance teams.',
                iconBg: 'rgba(88,84,255,0.15)',
                iconColor: '#7B7AFF',
                icon: 'linear_scale',
                available: false,
            },
            {
                id: 'github_issues',
                name: 'GitHub Issues',
                description: 'Track bugs and feature requests directly from GitHub.',
                iconBg: 'rgba(255,255,255,0.06)',
                iconColor: '#C9D1D9',
                icon: 'bug_report',
                available: false,
            },
        ],
    },
    {
        id: 'repos',
        label: 'Code Repositories',
        items: [
            {
                id: 'github',
                name: 'GitHub',
                description: 'Surface customer signals from repository activity.',
                iconBg: 'rgba(255,255,255,0.06)',
                iconColor: '#C9D1D9',
                icon: 'code',
                available: false,
            },
            {
                id: 'gitlab',
                name: 'GitLab',
                description: 'Connect GitLab projects to your customer feedback.',
                iconBg: 'rgba(252,109,38,0.15)',
                iconColor: '#FC6D26',
                icon: 'code',
                available: false,
            },
        ],
    },
];

// ---------------------------------------------------------------------------
// Connected card
// ---------------------------------------------------------------------------

interface ConnectedCardProps {
    integration: {
        id: string;
        name: string;
        description: string;
        iconBg: string;
        icon: string;
        synced: string;
        lastSync: string;
        status: string;
        errorMessage?: string;
    };
    isSyncing: boolean;
    isDisconnecting: boolean;
    onSyncNow: () => void;
    onDisconnect: () => void;
}

function ConnectedCard({ integration, isSyncing, isDisconnecting, onSyncNow, onDisconnect }: ConnectedCardProps) {
    const isError = integration.status === 'error';

    return (
        <div
            className="rounded-xl p-6 flex flex-col"
            style={{
                backgroundColor: '#161820',
                border: `1px solid ${isError ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.03)'}`,
            }}
        >
            {/* Icon + status badge */}
            <div className="flex justify-between items-start mb-4">
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: integration.iconBg }}
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
                        {integration.icon}
                    </span>
                </div>
                {isError ? (
                    <span
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase"
                        style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.1)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
                        Error
                    </span>
                ) : (
                    <span
                        className="text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase"
                        style={{ color: '#34D399', backgroundColor: 'rgba(52,211,153,0.1)' }}
                    >
                        Connected
                    </span>
                )}
            </div>

            {/* Name + description */}
            <h3 className="text-lg font-bold text-white">{integration.name}</h3>
            <p className="text-xs text-[#8B8D97] mt-1 mb-6">{integration.description}</p>

            {/* Sync info / error message */}
            {isError ? (
                <div
                    className="rounded-lg p-3 mb-8 text-xs text-[#F87171]"
                    style={{ backgroundColor: 'rgba(248,113,113,0.07)' }}
                >
                    <span className="font-semibold">Sync failed: </span>
                    {integration.errorMessage ?? 'An unexpected error occurred. Please retry or reconnect.'}
                </div>
            ) : (
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-[11px] text-[#5A5C66] font-medium">
                        <span>{integration.synced}</span>
                        <span>{integration.lastSync}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#33343b' }}>
                        <div className="h-full w-full rounded-full" style={{ backgroundColor: '#34D399' }} />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-4">
                    <button
                        disabled={isSyncing}
                        onClick={onSyncNow}
                        className="text-xs font-semibold text-white transition-colors disabled:opacity-60"
                        onMouseEnter={e => { if (!isSyncing) e.currentTarget.style.color = '#afc6ff'; }}
                        onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                    >
                        {isSyncing ? 'Syncing…' : isError ? 'Retry Sync' : 'Sync Now'}
                    </button>
                    {!isError && (
                        <button
                            className="text-xs font-semibold text-white transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                        >
                            Configure
                        </button>
                    )}
                </div>
                <button
                    disabled={isDisconnecting}
                    onClick={onDisconnect}
                    className="text-xs font-semibold transition-colors disabled:opacity-60"
                    style={{ color: 'rgba(248,113,113,0.8)' }}
                    onMouseEnter={e => { if (!isDisconnecting) e.currentTarget.style.color = '#ffb4ab'; }}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.8)')}
                >
                    {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Connected card skeleton
// ---------------------------------------------------------------------------

function ConnectedCardSkeleton() {
    return (
        <div
            className="rounded-xl p-6 flex flex-col"
            style={{ backgroundColor: '#161820', border: '1px solid rgba(255,255,255,0.03)' }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#33343b' }} />
                <div className="w-16 h-5 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
            </div>
            <div className="w-32 h-5 rounded animate-pulse mb-2" style={{ backgroundColor: '#33343b' }} />
            <div className="w-48 h-3 rounded animate-pulse mb-6" style={{ backgroundColor: '#33343b' }} />
            <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                    <div className="w-24 h-3 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
                    <div className="w-28 h-3 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
                </div>
                <div className="h-1 rounded-full animate-pulse" style={{ backgroundColor: '#33343b' }} />
            </div>
            <div className="mt-auto flex justify-between">
                <div className="flex gap-4">
                    <div className="w-14 h-3 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
                    <div className="w-16 h-3 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
                </div>
                <div className="w-16 h-3 rounded animate-pulse" style={{ backgroundColor: '#33343b' }} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Available card
// ---------------------------------------------------------------------------

interface AvailableCardProps {
    integration: (typeof CATEGORIES)[0]['items'][0];
    onConnect: () => void;
}

function AvailableCard({ integration, onConnect }: AvailableCardProps) {
    return (
        <div
            className="rounded-xl p-6 flex flex-col transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid rgba(255,255,255,0.02)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.02)')}
        >
            <div className="flex justify-between items-start mb-4">
                <div
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{ backgroundColor: integration.iconBg }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: integration.iconColor }}>
                        {integration.icon}
                    </span>
                </div>
            </div>

            <h4 className="text-base font-bold text-white">{integration.name}</h4>
            <p className="text-xs text-[#5A5C66] mt-2 mb-6 line-clamp-2">{integration.description}</p>

            <button
                onClick={onConnect}
                className="mt-auto w-full py-2 rounded text-xs font-semibold transition-colors"
                style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#33343b')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                Connect
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Coming soon card
// ---------------------------------------------------------------------------

function ComingSoonCard({ item }: { item: (typeof CATEGORIES)[0]['items'][0] }) {
    return (
        <div
            className="rounded-xl p-6 flex flex-col relative overflow-hidden"
            style={{
                backgroundColor: 'rgba(22,24,32,0.4)',
                border: '1px dashed rgba(255,255,255,0.05)',
                opacity: 0.6,
                filter: 'grayscale(1)',
            }}
        >
            <div className="absolute top-2 right-2 text-[#5A5C66]">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
            </div>

            <div
                className="w-10 h-10 rounded flex items-center justify-center mb-4"
                style={{ backgroundColor: '#1e1f26' }}
            >
                <span className="material-symbols-outlined text-[#8B8D97]" style={{ fontSize: 20 }}>
                    {item.icon}
                </span>
            </div>

            <h4 className="text-sm font-bold text-[#c8cad6]">{item.name}</h4>
            <p className="text-[11px] text-[#5A5C66] mt-1 uppercase font-bold tracking-widest">
                Coming Soon
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
    const { showToast } = useToast();

    const {
        connections,
        dataSources,
        loading,
        error,
        syncingIds,
        disconnectingIds,
        connectModalOpen,
        connectModalDataSourceId,
        connectModalStep,
        connectModalError,
        syncNow,
        disconnect,
        openConnectModal,
        closeConnectModal,
        submitConnect,
        submitCsvConnect,
    } = useIntegrations();

    const connectModalProvider = dataSources.find(d => d.id === connectModalDataSourceId)?.provider ?? null;

    useEffect(() => {
        if (error) showToast(`Failed to load integrations: ${error}`, 'error');
    }, [error, showToast]);

    // ── Derived data ──────────────────────────────────────────────────────────

    // Deduplicate by provider — prefer 'connected' over 'error' so only one card
    // shows per provider. This also prevents the catalog from offering a second
    // "Connect" for a provider that already has an active or errored connection.
    const STATUS_ORDER = ['connected', 'syncing', 'error'];
    const dedupedConnections = Object.values(
        connections.reduce((acc, conn) => {
            const key = conn.data_source.provider;
            if (
                !acc[key] ||
                STATUS_ORDER.indexOf(conn.status) < STATUS_ORDER.indexOf(acc[key].status)
            ) {
                acc[key] = conn;
            }
            return acc;
        }, {} as Record<string, SourceConnectionResponse>)
    );

    const connectedCards = dedupedConnections.map((conn: SourceConnectionResponse) => {
        const display = PROVIDER_DISPLAY[conn.data_source.provider] ?? {
            iconBg: '#1e1f26',
            icon: 'cloud',
            description: '',
        };
        return {
            id: conn.id,
            connectionId: conn.id,
            name: conn.data_source.display_name,
            description: display.description,
            iconBg: display.iconBg,
            icon: display.icon,
            synced: `${conn.total_records_synced} records synced`,
            lastSync: `Last sync: ${formatRelativeTime(conn.last_synced_at)}`,
            status: conn.status,
            errorMessage: conn.last_error_summary,
        };
    });

    const connectedProviders = new Set(connections.map(c => c.data_source.provider));

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSyncNow = async (connectionId: string) => {
        try {
            await syncNow(connectionId);
            showToast('Sync started successfully', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
        }
    };

    const handleDisconnect = async (connectionId: string) => {
        try {
            await disconnect(connectionId);
            showToast('Integration disconnected', 'info');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Disconnect failed', 'error');
        }
    };

    const handleConnect = (providerId: string, name: string) => {
        if (connectedProviders.has(providerId)) {
            showToast(`${name} is already connected. Disconnect it first to reconnect.`, 'error');
            return;
        }
        const ds = dataSources.find(d => d.provider === providerId);
        if (ds) {
            openConnectModal(ds.id);
        } else {
            showToast(`${name} integration coming soon!`, 'info');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="overflow-y-auto flex-1" style={{ backgroundColor: '#0F1117' }}>
            <div className="p-10 max-w-7xl mx-auto w-full">

                {/* ── Page header ── */}
                <section className="flex justify-between items-start">
                    <div>
                        <h1 className="text-[24px] font-bold text-[#F0F0F3] leading-tight">Integrations</h1>
                        <p className="text-[13px] text-[#8B8D97] mt-1">
                            Connect your customer data sources for automatic signal ingestion
                        </p>
                    </div>
                    <button
                        className="flex items-center gap-2 text-[13px] font-semibold transition-opacity hover:opacity-80"
                        style={{ color: '#afc6ff' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                        Request Integration
                    </button>
                </section>

                {/* ── Section 1: Connected ── */}
                <section className="mt-10">
                    <div className="flex items-center gap-3 mb-5">
                        <h2 className="text-sm font-semibold tracking-wide text-[#F0F0F3]">Connected Sources</h2>
                        <div
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                            <span className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">
                                {loading ? '—' : `${connections.length} active`}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {loading ? (
                            [0, 1].map(i => <ConnectedCardSkeleton key={i} />)
                        ) : connectedCards.length > 0 ? (
                            connectedCards.map(c => (
                                <ConnectedCard
                                    key={c.id}
                                    integration={c}
                                    isSyncing={syncingIds.has(c.connectionId)}
                                    isDisconnecting={disconnectingIds.has(c.connectionId)}
                                    onSyncNow={() => handleSyncNow(c.connectionId)}
                                    onDisconnect={() => handleDisconnect(c.connectionId)}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-[#5A5C66] col-span-2">
                                No integrations connected yet. Connect one below to start ingesting signals.
                            </p>
                        )}
                    </div>
                </section>

                {/* ── Sections 2+: Category groups ── */}
                {CATEGORIES.map(category => {
                    const visibleItems = category.items.filter(
                        item => !connectedProviders.has(item.id)
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <section key={category.id} className="mt-16">
                            <div className="flex items-center gap-3 mb-6">
                                <div
                                    className="flex-1 h-px"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                />
                                <h2 className="text-xs font-semibold tracking-widest uppercase text-[#5A5C66] px-2 whitespace-nowrap">
                                    {category.label}
                                </h2>
                                <div
                                    className="flex-1 h-px"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleItems.map(item =>
                                    item.available ? (
                                        <AvailableCard
                                            key={item.id}
                                            integration={item}
                                            onConnect={() => handleConnect(item.id, item.name)}
                                        />
                                    ) : (
                                        <ComingSoonCard key={item.id} item={item} />
                                    )
                                )}
                            </div>
                        </section>
                    );
                })}

                <div className="mb-20" />

            </div>

            {/* ── Connect Modal ── */}
            <ConnectModal
                open={connectModalOpen}
                step={connectModalStep}
                error={connectModalError}
                provider={connectModalProvider}
                onClose={closeConnectModal}
                onSubmit={submitConnect}
                onSubmitCsv={submitCsvConnect}
            />

        </div>
    );
}
