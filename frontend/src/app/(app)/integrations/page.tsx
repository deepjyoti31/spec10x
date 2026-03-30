'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CONNECTED = [
    {
        id: 'zendesk',
        name: 'Zendesk',
        description: 'Support tickets and customer conversations',
        iconBg: '#03363D',
        icon: 'support',
        synced: '89 tickets synced',
        lastSync: 'Last sync: 2 hours ago',
    },
    {
        id: 'fireflies',
        name: 'Fireflies.ai',
        description: 'Meeting recordings and AI transcriptions',
        iconBg: '#5340FF',
        icon: 'mic',
        synced: '23 meetings synced',
        lastSync: 'Last sync: 12 hours ago',
    },
];

const AVAILABLE = [
    {
        id: 'intercom',
        name: 'Intercom',
        description: 'Real-time messaging for customer support and engagement.',
        iconBg: 'rgba(175,198,255,0.2)',
        iconColor: '#afc6ff',
        icon: 'forum',
        category: 'Support',
    },
    {
        id: 'typeform',
        name: 'Typeform',
        description: 'Engage customers with conversational forms and surveys.',
        iconBg: 'rgba(51,51,51,0.4)',
        iconColor: '#F0F0F3',
        icon: 'list_alt',
        category: 'Surveys',
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Streamline team collaboration and automated notifications.',
        iconBg: 'rgba(224,30,90,0.2)',
        iconColor: '#E01E5A',
        icon: 'chat',
        category: 'Communication',
    },
    {
        id: 'jira',
        name: 'Jira',
        description: 'Connect engineering issues to customer feedback loops.',
        iconBg: 'rgba(0,82,204,0.2)',
        iconColor: '#0052CC',
        icon: 'task',
        category: 'Development',
    },
    {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'Sync customer profiles and sales activities seamlessly.',
        iconBg: 'rgba(255,122,89,0.2)',
        iconColor: '#FF7A59',
        icon: 'person',
        category: 'CRM',
    },
    {
        id: 'gmeet',
        name: 'Google Meet',
        description: 'Record and transcribe video calls for deeper insights.',
        iconBg: 'rgba(66,133,244,0.2)',
        iconColor: '#4285F4',
        icon: 'video_call',
        category: 'Meetings',
    },
];

const COMING_SOON = [
    { id: 'gong',     name: 'Gong',     icon: 'trending_up', version: 'Coming in v0.8' },
    { id: 'segment',  name: 'Segment',  icon: 'hub',         version: 'Coming in v0.8' },
    { id: 'mixpanel', name: 'Mixpanel', icon: 'pie_chart',   version: 'Coming in v1.0' },
];

const FILTER_TABS = ['All', 'Support', 'Meetings', 'Surveys', 'Analytics'];

// ---------------------------------------------------------------------------
// Connected card
// ---------------------------------------------------------------------------

function ConnectedCard({ integration }: { integration: typeof CONNECTED[0] }) {
    return (
        <div
            className="rounded-xl p-6 flex flex-col"
            style={{ backgroundColor: '#161820', border: '1px solid rgba(255,255,255,0.03)' }}
        >
            {/* Icon + badge */}
            <div className="flex justify-between items-start mb-4">
                <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: integration.iconBg }}
                >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
                        {integration.icon}
                    </span>
                </div>
                <span
                    className="text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase"
                    style={{ color: '#34D399', backgroundColor: 'rgba(52,211,153,0.1)' }}
                >
                    Connected
                </span>
            </div>

            {/* Name + description */}
            <h3 className="text-lg font-bold text-white">{integration.name}</h3>
            <p className="text-xs text-[#8B8D97] mt-1 mb-6">{integration.description}</p>

            {/* Sync info + bar */}
            <div className="space-y-4 mb-8">
                <div className="flex justify-between text-[11px] text-[#5A5C66] font-medium">
                    <span>{integration.synced}</span>
                    <span>{integration.lastSync}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#33343b' }}>
                    <div className="h-full w-full rounded-full" style={{ backgroundColor: '#34D399' }} />
                </div>
            </div>

            {/* Actions */}
            <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-4">
                    {['Sync Now', 'Configure'].map(action => (
                        <button
                            key={action}
                            className="text-xs font-semibold text-white transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                        >
                            {action}
                        </button>
                    ))}
                </div>
                <button
                    className="text-xs font-semibold transition-colors"
                    style={{ color: 'rgba(248,113,113,0.8)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ffb4ab')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.8)')}
                >
                    Disconnect
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Available card
// ---------------------------------------------------------------------------

function AvailableCard({ integration }: { integration: typeof AVAILABLE[0] }) {
    return (
        <div
            className="rounded-xl p-6 flex flex-col transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid rgba(255,255,255,0.02)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.02)')}
        >
            {/* Icon + category */}
            <div className="flex justify-between items-start mb-4">
                <div
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{ backgroundColor: integration.iconBg }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: integration.iconColor }}>
                        {integration.icon}
                    </span>
                </div>
                <span
                    className="text-[10px] px-2 py-0.5 rounded font-medium text-[#8B8D97]"
                    style={{ backgroundColor: '#33343b' }}
                >
                    {integration.category}
                </span>
            </div>

            {/* Name */}
            <h4
                className="text-base font-bold text-white transition-colors"
                /* hover color handled by parent group — using inline onMouseEnter instead */
            >
                {integration.name}
            </h4>

            {/* Description */}
            <p className="text-xs text-[#5A5C66] mt-2 mb-6 line-clamp-2">{integration.description}</p>

            {/* Connect button */}
            <button
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

function ComingSoonCard({ item }: { item: typeof COMING_SOON[0] }) {
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
            {/* Lock icon */}
            <div className="absolute top-2 right-2 text-[#5A5C66]">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
            </div>

            {/* Icon */}
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
                {item.version}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
    const [activeFilter, setActiveFilter] = useState('All');

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
                        <h2 className="text-sm font-semibold tracking-wide text-[#F0F0F3]">Connected</h2>
                        <div
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                            <span className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">
                                2 active
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CONNECTED.map(c => <ConnectedCard key={c.id} integration={c} />)}
                    </div>
                </section>

                {/* ── Section 2: Available ── */}
                <section className="mt-16">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-sm font-semibold tracking-wide text-[#F0F0F3]">
                            Available Integrations
                        </h2>
                        <span className="text-[13px] text-[#8B8D97]">4 available</span>
                    </div>

                    {/* Filter row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        {/* Category tabs */}
                        <div
                            className="flex items-center gap-1 p-1 rounded-lg"
                            style={{
                                backgroundColor: '#0c0e14',
                                border: '1px solid rgba(255,255,255,0.02)',
                            }}
                        >
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveFilter(tab)}
                                    className="px-4 py-1.5 text-xs font-medium rounded-md transition-colors"
                                    style={
                                        activeFilter === tab
                                            ? { backgroundColor: '#afc6ff', color: '#002D6C', fontWeight: 600 }
                                            : { color: '#8B8D97' }
                                    }
                                    onMouseEnter={e => {
                                        if (activeFilter !== tab) (e.currentTarget.style.color = '#F0F0F3');
                                    }}
                                    onMouseLeave={e => {
                                        if (activeFilter !== tab) (e.currentTarget.style.color = '#8B8D97');
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Filter input */}
                        <div className="relative w-full md:w-[300px]">
                            <span
                                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5C66]"
                                style={{ fontSize: 18 }}
                            >
                                filter_list
                            </span>
                            <input
                                type="text"
                                placeholder="Filter by name..."
                                className="w-full rounded-lg py-2 pl-10 pr-4 text-xs outline-none transition-all"
                                style={{
                                    backgroundColor: '#0c0e14',
                                    border: '1px solid transparent',
                                    color: '#F0F0F3',
                                }}
                                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(175,198,255,0.4)')}
                                onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
                            />
                        </div>
                    </div>

                    {/* Available grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AVAILABLE.map(a => <AvailableCard key={a.id} integration={a} />)}
                    </div>
                </section>

                {/* ── Section 3: Coming Soon ── */}
                <section className="mt-16 mb-20">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold tracking-wide text-[#F0F0F3]">Coming Soon</h2>
                        <button
                            className="text-xs font-semibold flex items-center gap-1 hover:underline transition-colors"
                            style={{ color: '#afc6ff' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>how_to_vote</span>
                            Vote for next
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {COMING_SOON.map(item => <ComingSoonCard key={item.id} item={item} />)}
                    </div>
                </section>

            </div>
        </div>
    );
}
