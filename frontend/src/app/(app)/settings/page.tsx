'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
    {
        title: 'Account',
        items: [
            { id: 'profile',       label: 'Profile',       icon: 'person' },
            { id: 'notifications', label: 'Notifications',  icon: 'notifications' },
            { id: 'appearance',    label: 'Appearance',     icon: 'palette' },
        ],
    },
    {
        title: 'Workspace',
        items: [
            { id: 'general',    label: 'General',         icon: 'settings' },
            { id: 'billing',    label: 'Billing',         icon: 'credit_card' },
            { id: 'api-keys',   label: 'API Keys',        icon: 'key' },
            { id: 'data',       label: 'Data Management', icon: 'database' },
        ],
    },
    {
        title: 'Advanced',
        items: [
            { id: 'ai-model', label: 'AI Model',      icon: 'memory' },
            { id: 'import',   label: 'Import / Export', icon: 'swap_horiz' },
            { id: 'danger',   label: 'Danger Zone',    icon: 'warning', danger: true },
        ],
    },
];

// ---------------------------------------------------------------------------
// Settings nav sidebar
// ---------------------------------------------------------------------------

function SettingsNav({
    active,
    onChange,
}: {
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <aside
            className="flex flex-col py-8 overflow-y-auto flex-shrink-0"
            style={{
                width: 220,
                backgroundColor: '#0C0D12',
                borderRight: '1px solid #1E2028',
            }}
        >
            <div className="px-6 mb-8">
                <h2 className="text-[16px] font-semibold text-[#F0F0F3]">Settings</h2>
            </div>

            <div className="space-y-8 px-3">
                {NAV_SECTIONS.map(section => (
                    <section key={section.title}>
                        <h3
                            className="px-3 text-[10px] uppercase tracking-widest font-bold mb-3"
                            style={{ color: '#424753' }}
                        >
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map(item => {
                                const isActive = active === item.id;
                                const isDanger = (item as { danger?: boolean }).danger;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onChange(item.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                                        style={{
                                            backgroundColor: isActive ? 'rgba(79,140,255,0.1)' : 'transparent',
                                            color: isActive
                                                ? '#4F8CFF'
                                                : isDanger
                                                ? 'rgba(248,113,113,0.8)'
                                                : '#8B8D97',
                                            fontWeight: isActive ? 600 : 400,
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = isDanger
                                                    ? 'rgba(248,113,113,0.1)'
                                                    : '#1E1F26';
                                                if (!isDanger)
                                                    (e.currentTarget as HTMLElement).style.color = '#F0F0F3';
                                                else
                                                    (e.currentTarget as HTMLElement).style.color = '#F87171';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                                (e.currentTarget as HTMLElement).style.color = isDanger
                                                    ? 'rgba(248,113,113,0.8)'
                                                    : '#8B8D97';
                                            }
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </aside>
    );
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label
            className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: '#8B8D97' }}
        >
            {children}
        </label>
    );
}

function TextInput({
    value,
    type = 'text',
    placeholder,
    readOnly,
    suffix,
}: {
    value?: string;
    type?: string;
    placeholder?: string;
    readOnly?: boolean;
    suffix?: React.ReactNode;
}) {
    const [val, setVal] = useState(value ?? '');
    return (
        <div className="relative">
            <input
                type={type}
                value={val}
                onChange={e => setVal(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className="w-full rounded-lg text-sm outline-none transition-all py-2.5 px-3"
                style={{
                    backgroundColor: '#0C0D12',
                    border: '1px solid #1E2028',
                    color: '#e2e2eb',
                    paddingRight: suffix ? '5rem' : undefined,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,140,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1E2028')}
            />
            {suffix && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                    {suffix}
                </div>
            )}
        </div>
    );
}

function SelectInput({ options }: { options: string[] }) {
    return (
        <div className="relative">
            <select
                className="w-full rounded-lg text-sm outline-none py-2.5 px-3 appearance-none transition-all"
                style={{
                    backgroundColor: '#0C0D12',
                    border: '1px solid #1E2028',
                    color: '#e2e2eb',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,140,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1E2028')}
            >
                {options.map(o => <option key={o}>{o}</option>)}
            </select>
            <span
                className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ fontSize: 16, color: '#424753' }}
            >
                expand_more
            </span>
        </div>
    );
}

function CardFooter({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="px-6 py-4 flex justify-end border-t"
            style={{ backgroundColor: 'rgba(30,32,40,0.3)', borderColor: '#1E2028' }}
        >
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Profile section
// ---------------------------------------------------------------------------

function ProfilePanel() {
    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Profile</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>
                    Manage your personal account settings
                </p>
            </header>

            {/* Profile info card */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            >
                <div className="p-6">
                    {/* Avatar row */}
                    <div className="flex items-center gap-6 mb-8">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                            style={{
                                backgroundColor: 'rgba(82,141,255,0.2)',
                                color: '#4F8CFF',
                                border: '1px solid rgba(79,140,255,0.2)',
                            }}
                        >
                            DJ
                        </div>
                        <div>
                            <button
                                className="text-xs font-semibold hover:underline"
                                style={{ color: '#4F8CFF' }}
                            >
                                Change avatar
                            </button>
                            <p className="text-[11px] mt-1" style={{ color: '#424753' }}>
                                JPG, GIF or PNG. 1MB Max.
                            </p>
                        </div>
                    </div>

                    {/* Fields grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <FieldLabel>Full Name</FieldLabel>
                            <TextInput value="Deep Jyoti" />
                        </div>
                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <TextInput
                                value="deep@spec10x.com"
                                type="email"
                                suffix={
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 whitespace-nowrap">
                                        Verified
                                        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                                            check_circle
                                        </span>
                                    </span>
                                }
                            />
                        </div>
                        <div>
                            <FieldLabel>Role</FieldLabel>
                            <SelectInput options={['Product Manager', 'Designer', 'Developer']} />
                        </div>
                        <div>
                            <FieldLabel>Company</FieldLabel>
                            <TextInput value="Spec10x" />
                        </div>
                    </div>
                </div>
                <CardFooter>
                    <button
                        className="text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#4F8CFF', color: '#002d6c' }}
                    >
                        Save Changes
                    </button>
                </CardFooter>
            </div>

            {/* Password card */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            >
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">Security &amp; Password</h3>
                    <div className="space-y-4 max-w-md">
                        {[
                            { label: 'Current Password',     placeholder: '••••••••' },
                            { label: 'New Password',         placeholder: 'Enter new password' },
                            { label: 'Confirm New Password', placeholder: 'Confirm new password' },
                        ].map(field => (
                            <div key={field.label}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <TextInput type="password" placeholder={field.placeholder} />
                            </div>
                        ))}
                    </div>
                </div>
                <CardFooter>
                    <button
                        className="text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        style={{ border: '1px solid #424753', color: '#8B8D97' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#8B8D97')}
                    >
                        Update Password
                    </button>
                </CardFooter>
            </div>

            {/* Active sessions card */}
            <div
                className="rounded-xl overflow-hidden mb-12"
                style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            >
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">Active Sessions</h3>
                    <div className="space-y-0">

                        {/* Current session */}
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: '#111319', color: '#8B8D97' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        desktop_windows
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Chrome on Windows</p>
                                    <p className="text-[11px] font-medium text-emerald-500">Active now</p>
                                </div>
                            </div>
                            <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter"
                                style={{
                                    color: '#424753',
                                    border: '1px solid rgba(66,71,83,0.3)',
                                }}
                            >
                                Current Device
                            </span>
                        </div>

                        {/* Other session */}
                        <div
                            className="flex items-center justify-between py-3 border-t"
                            style={{ borderColor: 'rgba(30,32,40,0.5)' }}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: '#111319', color: '#8B8D97' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        smartphone
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Safari on iPhone</p>
                                    <p className="text-[11px]" style={{ color: '#424753' }}>
                                        Last active 3 days ago · San Francisco, US
                                    </p>
                                </div>
                            </div>
                            <button
                                className="text-[11px] font-bold transition-colors"
                                style={{ color: 'rgba(248,113,113,0.7)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#F87171')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.7)')}
                            >
                                Revoke
                            </button>
                        </div>
                    </div>

                    {/* Sign out all */}
                    <div className="mt-6 pt-6 border-t" style={{ borderColor: '#1E2028' }}>
                        <button
                            className="text-xs font-semibold flex items-center gap-2 hover:underline"
                            style={{ color: '#4F8CFF' }}
                        >
                            Sign out all other sessions
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Placeholder panel for unbuilt sections
// ---------------------------------------------------------------------------

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">{title}</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>{description}</p>
            </header>
            <div
                className="rounded-xl flex items-center justify-center py-24"
                style={{ backgroundColor: '#161820', border: '1px dashed #1E2028' }}
            >
                <p className="text-sm" style={{ color: '#424753' }}>Content coming soon</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Panel router
// ---------------------------------------------------------------------------

const PANEL_META: Record<string, { title: string; description: string }> = {
    notifications: { title: 'Notifications',  description: 'Control how and when you receive alerts' },
    appearance:    { title: 'Appearance',      description: 'Customize the look and feel of your workspace' },
    general:       { title: 'General',         description: 'Workspace-level configuration' },
    billing:       { title: 'Billing',         description: 'Manage your subscription and payment methods' },
    'api-keys':    { title: 'API Keys',        description: 'Create and manage API access tokens' },
    data:          { title: 'Data Management', description: 'Control data retention and exports' },
    'ai-model':    { title: 'AI Model',        description: 'Configure the AI model used for analysis' },
    import:        { title: 'Import / Export', description: 'Bulk import or export your workspace data' },
    danger:        { title: 'Danger Zone',     description: 'Irreversible actions — proceed with caution' },
};

function ContentPanel({ activeSection }: { activeSection: string }) {
    if (activeSection === 'profile') return <ProfilePanel />;
    const meta = PANEL_META[activeSection];
    return <PlaceholderPanel title={meta?.title ?? ''} description={meta?.description ?? ''} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left nav */}
            <SettingsNav active={activeSection} onChange={setActiveSection} />

            {/* Right content */}
            <section
                className="flex-1 overflow-y-auto px-12 py-10"
                style={{ backgroundColor: '#0F1117' }}
            >
                <div className="max-w-[720px] mx-auto">
                    <ContentPanel activeSection={activeSection} />
                </div>
            </section>
        </div>
    );
}
