'use client';

import React, { useState, useRef } from 'react';
import { useProfileSettings, useBillingSettings, useDataSettings, useImportExportSettings, useDangerZone } from '@/hooks/useSettings';

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
    {
        title: 'Account',
        items: [
            { id: 'profile',       label: 'Profile',       icon: 'person' },
            { id: 'notifications', label: 'Notifications',  icon: 'notifications', disabled: true },
            { id: 'appearance',    label: 'Appearance',     icon: 'palette', disabled: true },
        ],
    },
    {
        title: 'Workspace',
        items: [
            { id: 'general',    label: 'General',         icon: 'settings', disabled: true },
            { id: 'billing',    label: 'Billing',         icon: 'credit_card' },
            { id: 'api-keys',   label: 'API Keys',        icon: 'key', disabled: true },
            { id: 'data',       label: 'Data Management', icon: 'database' },
        ],
    },
    {
        title: 'Advanced',
        items: [
            { id: 'ai-model', label: 'AI Model',      icon: 'memory', disabled: true },
            { id: 'import',   label: 'Import / Export', icon: 'swap_horiz' },
            { id: 'danger',   label: 'Danger Zone',    icon: 'warning', danger: true },
        ],
    },
];

type NavItem = { id: string; label: string; icon: string; disabled?: boolean; danger?: boolean };

// ---------------------------------------------------------------------------
// Settings nav sidebar
// ---------------------------------------------------------------------------

function SettingsNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
    return (
        <aside
            className="flex flex-col py-8 overflow-y-auto flex-shrink-0"
            style={{ width: 220, backgroundColor: '#0C0D12', borderRight: '1px solid #1E2028' }}
        >
            <div className="px-6 mb-8">
                <h2 className="text-[16px] font-semibold text-[#F0F0F3]">Settings</h2>
            </div>
            <div className="space-y-8 px-3">
                {NAV_SECTIONS.map(section => (
                    <section key={section.title}>
                        <h3 className="px-3 text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: '#424753' }}>
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map((item: NavItem) => {
                                const isActive = active === item.id;
                                const isDanger = item.danger;
                                const isDisabled = item.disabled;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => !isDisabled && onChange(item.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                                        style={{
                                            backgroundColor: isActive ? 'rgba(175,198,255,0.1)' : 'transparent',
                                            color: isDisabled ? '#2A2D35' : isActive ? '#afc6ff' : isDanger ? 'rgba(248,113,113,0.8)' : '#8B8D97',
                                            fontWeight: isActive ? 600 : 400,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isDisabled ? 0.5 : 1,
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive && !isDisabled) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = isDanger ? 'rgba(248,113,113,0.1)' : '#1E1F26';
                                                if (!isDanger) (e.currentTarget as HTMLElement).style.color = '#F0F0F3';
                                                else (e.currentTarget as HTMLElement).style.color = '#ffb4ab';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive && !isDisabled) {
                                                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                                (e.currentTarget as HTMLElement).style.color = isDanger ? 'rgba(248,113,113,0.8)' : '#8B8D97';
                                            }
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{item.icon}</span>
                                        {item.label}
                                        {isDisabled && <span className="text-[9px] ml-auto opacity-50">Soon</span>}
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
// Shared form helpers (unchanged design)
// ---------------------------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8B8D97' }}>{children}</label>;
}

function TextInput({ value, onChange, type = 'text', placeholder, readOnly, suffix }: {
    value?: string; onChange?: (v: string) => void; type?: string; placeholder?: string; readOnly?: boolean; suffix?: React.ReactNode;
}) {
    return (
        <div className="relative">
            <input
                type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
                placeholder={placeholder} readOnly={readOnly}
                className="w-full rounded-lg text-sm outline-none transition-all py-2.5 px-3"
                style={{ backgroundColor: '#0C0D12', border: '1px solid #1E2028', color: '#e2e2eb', paddingRight: suffix ? '5rem' : undefined }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1E2028')}
            />
            {suffix && <div className="absolute inset-y-0 right-3 flex items-center">{suffix}</div>}
        </div>
    );
}

function SelectInput({ options, value, onChange }: { options: string[]; value?: string; onChange?: (v: string) => void }) {
    return (
        <div className="relative">
            <select
                value={value} onChange={e => onChange?.(e.target.value)}
                className="w-full rounded-lg text-sm outline-none py-2.5 px-3 appearance-none transition-all"
                style={{ backgroundColor: '#0C0D12', border: '1px solid #1E2028', color: '#e2e2eb' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.5)')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1E2028')}
            >
                {options.map(o => <option key={o}>{o}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: 16, color: '#424753' }}>expand_more</span>
        </div>
    );
}

function CardFooter({ children }: { children: React.ReactNode }) {
    return <div className="px-6 py-4 flex justify-end border-t" style={{ backgroundColor: 'rgba(30,32,40,0.3)', borderColor: '#1E2028' }}>{children}</div>;
}

function PrimaryBtn({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled || loading}
            className="text-xs font-bold px-4 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}>
            {loading ? 'Saving…' : children}
        </button>
    );
}

function SecondaryBtn({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled || loading}
            className="text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ border: '1px solid #424753', color: '#8B8D97' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8B8D97')}>
            {loading ? 'Working…' : children}
        </button>
    );
}

function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg animate-[fadeIn_0.2s_ease]"
            style={{ backgroundColor: type === 'success' ? '#16a34a' : '#dc2626', color: 'white' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{type === 'success' ? 'check_circle' : 'error'}</span>
            {message}
        </div>
    );
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const fmt = (n: number) => unit === 'bytes' ? `${(n / (1024 * 1024)).toFixed(1)} MB` : n.toLocaleString();
    return (
        <div className="mb-4">
            <div className="flex justify-between text-[11px] mb-1.5">
                <span style={{ color: '#8B8D97' }}>{label}</span>
                <span style={{ color: '#e2e2eb' }}>{fmt(used)} / {fmt(limit)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: '#1E2028' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#f87171' : '#afc6ff' }} />
            </div>
        </div>
    );
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, loading, danger }: {
    title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; loading?: boolean; danger?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="rounded-xl p-6 w-[420px]" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-[12px] mb-6" style={{ color: '#8B8D97' }}>{message}</p>
                <div className="flex justify-end gap-3">
                    <SecondaryBtn onClick={onCancel} disabled={loading}>Cancel</SecondaryBtn>
                    <button onClick={onConfirm} disabled={loading}
                        className="text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: danger ? '#dc2626' : '#afc6ff', color: danger ? 'white' : '#002d6c' }}>
                        {loading ? 'Processing…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Profile Panel (Dynamic)
// ---------------------------------------------------------------------------

function ProfilePanel() {
    const { user, localName, saving, saveError, saveSuccess, saveName, pwSaving, pwError, pwSuccess, changePassword } = useProfileSettings();

    const [name, setName] = useState('');
    const [nameLoaded, setNameLoaded] = useState(false);
    const [curPw, setCurPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');

    // Seed name from user once loaded
    if (user && !nameLoaded) { setName(localName ?? user.name ?? ''); setNameLoaded(true); }

    const displayName = localName ?? user?.name ?? '';
    const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    const isEmailVerified = !!user?.email;

    const handleSave = () => { if (name.trim()) saveName(name.trim()); };
    const handlePwChange = () => {
        if (!curPw || !newPw) return;
        if (newPw !== confirmPw) return;
        changePassword(curPw, newPw);
        if (!pwError) { setCurPw(''); setNewPw(''); setConfirmPw(''); }
    };

    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Profile</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>Manage your personal account settings</p>
            </header>

            {/* Profile info card */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                            style={{ backgroundColor: 'rgba(82,141,255,0.2)', color: '#afc6ff', border: '1px solid rgba(175,198,255,0.2)' }}>
                            {initials}
                        </div>
                        <div>
                            <button className="text-xs font-semibold hover:underline" style={{ color: '#afc6ff' }}>Change avatar</button>
                            <p className="text-[11px] mt-1" style={{ color: '#424753' }}>JPG, GIF or PNG. 1MB Max.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><FieldLabel>Full Name</FieldLabel><TextInput value={name} onChange={setName} /></div>
                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <TextInput value={user?.email ?? ''} readOnly
                                suffix={isEmailVerified ? <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 whitespace-nowrap">Verified<span className="material-symbols-outlined" style={{ fontSize: 10 }}>check_circle</span></span> : undefined}
                            />
                        </div>
                        <div><FieldLabel>Role</FieldLabel><SelectInput options={['Product Manager', 'Designer', 'Developer']} /></div>
                        <div><FieldLabel>Plan</FieldLabel><TextInput value={(user?.plan ?? 'free').charAt(0).toUpperCase() + (user?.plan ?? 'free').slice(1)} readOnly /></div>
                    </div>
                </div>
                <CardFooter><PrimaryBtn onClick={handleSave} loading={saving}>Save Changes</PrimaryBtn></CardFooter>
            </div>

            {/* Password card */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">Security &amp; Password</h3>
                    <div className="space-y-4 max-w-md">
                        <div><FieldLabel>Current Password</FieldLabel><TextInput type="password" placeholder="••••••••" value={curPw} onChange={setCurPw} /></div>
                        <div><FieldLabel>New Password</FieldLabel><TextInput type="password" placeholder="Enter new password" value={newPw} onChange={setNewPw} /></div>
                        <div><FieldLabel>Confirm New Password</FieldLabel><TextInput type="password" placeholder="Confirm new password" value={confirmPw} onChange={setConfirmPw} /></div>
                        {newPw && confirmPw && newPw !== confirmPw && <p className="text-[11px] text-red-400">Passwords do not match</p>}
                    </div>
                </div>
                <CardFooter>
                    <SecondaryBtn onClick={handlePwChange} loading={pwSaving} disabled={!curPw || !newPw || newPw !== confirmPw}>Update Password</SecondaryBtn>
                </CardFooter>
            </div>

            {/* Active sessions card (static — no backend) */}
            <div className="rounded-xl overflow-hidden mb-12" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">Active Sessions</h3>
                    <div className="space-y-0">
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#111319', color: '#8B8D97' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>desktop_windows</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Current Session</p>
                                    <p className="text-[11px] font-medium text-emerald-500">Active now</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter" style={{ color: '#424753', border: '1px solid rgba(66,71,83,0.3)' }}>
                                Current Device
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {saveSuccess && <Toast message="Profile updated successfully" />}
            {saveError && <Toast message={saveError} type="error" />}
            {pwSuccess && <Toast message="Password updated successfully" />}
            {pwError && <Toast message={pwError} type="error" />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Billing Panel (Dynamic)
// ---------------------------------------------------------------------------

function BillingPanel() {
    const { limits, loading } = useBillingSettings();

    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Billing</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>Manage your subscription and payment methods</p>
            </header>

            {loading ? (
                <div className="rounded-xl flex items-center justify-center py-16" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                    <p className="text-sm" style={{ color: '#424753' }}>Loading billing info…</p>
                </div>
            ) : limits ? (
                <>
                    {/* Plan card */}
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Current Plan</h3>
                                    <p className="text-[11px] mt-1" style={{ color: '#424753' }}>Your workspace is on the <strong className="text-[#afc6ff]">{limits.plan.charAt(0).toUpperCase() + limits.plan.slice(1)}</strong> plan</p>
                                </div>
                                <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                                    style={{ backgroundColor: 'rgba(175,198,255,0.15)', color: '#afc6ff', border: '1px solid rgba(175,198,255,0.2)' }}>
                                    {limits.plan}
                                </span>
                            </div>
                            <UsageBar label="Interviews" used={limits.usage.interviews_uploaded} limit={limits.limits.interviews_per_month} />
                            <UsageBar label="AI Queries" used={limits.usage.qa_queries_used} limit={limits.limits.qa_queries_per_month} />
                            <UsageBar label="Storage" used={limits.usage.storage_bytes_used} limit={limits.limits.storage_bytes} unit="bytes" />
                        </div>
                        <CardFooter>
                            {limits.plan === 'free' ? (
                                <PrimaryBtn>Upgrade to Pro</PrimaryBtn>
                            ) : (
                                <SecondaryBtn>Manage Subscription</SecondaryBtn>
                            )}
                        </CardFooter>
                    </div>
                </>
            ) : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Data Management Panel (Dynamic)
// ---------------------------------------------------------------------------

function DataManagementPanel() {
    const { limits, loading, exporting, exportInsights, exportFeed, exportError } = useDataSettings();

    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Data Management</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>Control data retention and exports</p>
            </header>

            {/* Storage */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-6">Storage</h3>
                    {loading ? <p className="text-xs" style={{ color: '#424753' }}>Loading…</p> :
                        limits && <UsageBar label="Total Storage Used" used={limits.usage.storage_bytes_used} limit={limits.limits.storage_bytes} unit="bytes" />}
                </div>
            </div>

            {/* Export */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-2">Export Data</h3>
                    <p className="text-[11px] mb-6" style={{ color: '#424753' }}>Download your workspace data as Markdown files</p>
                    <div className="flex gap-3">
                        <SecondaryBtn onClick={exportInsights} loading={exporting === 'insights'}>
                            Export Insights
                        </SecondaryBtn>
                        <SecondaryBtn onClick={exportFeed} loading={exporting === 'feed'}>
                            Export Feed
                        </SecondaryBtn>
                    </div>
                </div>
            </div>

            {exportError && <Toast message={exportError} type="error" />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Import / Export Panel (Dynamic)
// ---------------------------------------------------------------------------

function ImportExportPanel() {
    const { step, preview, importResult, history, historyLoading, error, validateFile, confirmImport, reset, downloadTemplate } = useImportExportSettings();
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) validateFile(f);
    };

    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Import / Export</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>Bulk import or export your workspace data</p>
            </header>

            {/* CSV Import */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-2">Survey / NPS Import</h3>
                    <p className="text-[11px] mb-4" style={{ color: '#424753' }}>Upload a CSV file to import survey or NPS responses</p>

                    {step === 'idle' && (
                        <div className="flex gap-3">
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                            <PrimaryBtn onClick={() => fileRef.current?.click()}>Choose CSV File</PrimaryBtn>
                            <SecondaryBtn onClick={downloadTemplate}>Download Template</SecondaryBtn>
                        </div>
                    )}

                    {step === 'validating' && <p className="text-xs" style={{ color: '#afc6ff' }}>Validating file…</p>}

                    {step === 'preview' && preview && (
                        <div>
                            <p className="text-xs mb-3" style={{ color: '#e2e2eb' }}>{preview.row_count} rows found • {preview.column_names.length} columns</p>
                            {preview.warnings.length > 0 && preview.warnings.map((w, i) => (
                                <p key={i} className="text-[11px] text-amber-400 mb-1">⚠ {w}</p>
                            ))}
                            <div className="flex gap-3 mt-4">
                                <PrimaryBtn onClick={confirmImport}>Confirm Import</PrimaryBtn>
                                <SecondaryBtn onClick={reset}>Cancel</SecondaryBtn>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && <p className="text-xs" style={{ color: '#afc6ff' }}>Importing…</p>}

                    {step === 'done' && importResult && (
                        <div>
                            <p className="text-xs text-emerald-400 mb-3">✓ Import complete — {importResult.records_created} created, {importResult.records_updated} updated</p>
                            <SecondaryBtn onClick={reset}>Import Another</SecondaryBtn>
                        </div>
                    )}

                    {step === 'error' && (
                        <div>
                            <p className="text-xs text-red-400 mb-3">{error}</p>
                            <SecondaryBtn onClick={reset}>Try Again</SecondaryBtn>
                        </div>
                    )}
                </div>
            </div>

            {/* Import History */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}>
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">Import History</h3>
                    {historyLoading ? <p className="text-xs" style={{ color: '#424753' }}>Loading…</p> :
                        history.length === 0 ? <p className="text-xs" style={{ color: '#424753' }}>No imports yet</p> : (
                            <div className="space-y-2">
                                {history.map(h => (
                                    <div key={h.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(30,32,40,0.5)' }}>
                                        <div>
                                            <p className="text-xs text-white">{h.import_name}</p>
                                            <p className="text-[10px]" style={{ color: '#424753' }}>{h.records_created} created • {h.records_updated} updated</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                                            color: h.status === 'succeeded' ? '#4ade80' : h.status === 'failed' ? '#f87171' : '#afc6ff',
                                            backgroundColor: h.status === 'succeeded' ? 'rgba(74,222,128,0.1)' : h.status === 'failed' ? 'rgba(248,113,113,0.1)' : 'rgba(175,198,255,0.1)',
                                        }}>{h.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Danger Zone Panel (Dynamic)
// ---------------------------------------------------------------------------

function DangerZonePanel() {
    const { deletingData, deletingAccount, error, dataDeleted, deleteData, deleteAccount } = useDangerZone();
    const [confirmAction, setConfirmAction] = useState<'data' | 'account' | null>(null);

    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">Danger Zone</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>Irreversible actions — proceed with caution</p>
            </header>

            {/* Delete Data */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid rgba(248,113,113,0.15)' }}>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">Delete All Data</h3>
                            <p className="text-[11px]" style={{ color: '#8B8D97' }}>
                                {dataDeleted ? 'All workspace data has been deleted.' : 'Permanently delete all interviews, insights, themes, and conversations. Your account will remain intact.'}
                            </p>
                        </div>
                        <button onClick={() => setConfirmAction('data')} disabled={dataDeleted || deletingData}
                            className="text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                            style={{ border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                            {dataDeleted ? 'Deleted' : 'Delete Data'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Account */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161820', border: '1px solid rgba(248,113,113,0.15)' }}>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">Delete Account</h3>
                            <p className="text-[11px]" style={{ color: '#8B8D97' }}>
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        <button onClick={() => setConfirmAction('account')} disabled={deletingAccount}
                            className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0 disabled:opacity-40"
                            style={{ backgroundColor: '#dc2626', color: 'white' }}>
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {error && <Toast message={error} type="error" />}

            {confirmAction === 'data' && (
                <ConfirmModal danger title="Delete All Data"
                    message="This will permanently delete all your interviews, insights, themes, and conversations. This action cannot be undone."
                    confirmLabel="Yes, Delete All Data"
                    onConfirm={() => { deleteData(); setConfirmAction(null); }}
                    onCancel={() => setConfirmAction(null)}
                    loading={deletingData}
                />
            )}

            {confirmAction === 'account' && (
                <ConfirmModal danger title="Delete Account"
                    message="This will permanently delete your account and sign you out. All data associated with this account will be lost forever."
                    confirmLabel="Yes, Delete My Account"
                    onConfirm={() => { deleteAccount(); setConfirmAction(null); }}
                    onCancel={() => setConfirmAction(null)}
                    loading={deletingAccount}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Disabled placeholder panel for Phase 2 sections
// ---------------------------------------------------------------------------

function DisabledPanel({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-8">
            <header className="mb-10">
                <h1 className="text-[22px] font-bold text-white mb-1">{title}</h1>
                <p className="text-[13px]" style={{ color: '#8B8D97' }}>{description}</p>
            </header>
            <div className="rounded-xl flex flex-col items-center justify-center py-24" style={{ backgroundColor: '#161820', border: '1px dashed #1E2028' }}>
                <span className="material-symbols-outlined mb-3" style={{ fontSize: 32, color: '#2A2D35' }}>lock</span>
                <p className="text-sm font-medium" style={{ color: '#424753' }}>Coming soon</p>
                <p className="text-[11px] mt-1" style={{ color: '#2A2D35' }}>This feature is under development</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Panel router
// ---------------------------------------------------------------------------

const DISABLED_META: Record<string, { title: string; description: string }> = {
    notifications: { title: 'Notifications',  description: 'Control how and when you receive alerts' },
    appearance:    { title: 'Appearance',      description: 'Customize the look and feel of your workspace' },
    general:       { title: 'General',         description: 'Workspace-level configuration' },
    'api-keys':    { title: 'API Keys',        description: 'Create and manage API access tokens' },
    'ai-model':    { title: 'AI Model',        description: 'Configure the AI model used for analysis' },
};

function ContentPanel({ activeSection }: { activeSection: string }) {
    switch (activeSection) {
        case 'profile':  return <ProfilePanel />;
        case 'billing':  return <BillingPanel />;
        case 'data':     return <DataManagementPanel />;
        case 'import':   return <ImportExportPanel />;
        case 'danger':   return <DangerZonePanel />;
        default: {
            const meta = DISABLED_META[activeSection];
            return meta ? <DisabledPanel title={meta.title} description={meta.description} /> : null;
        }
    }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');

    return (
        <div className="flex h-full overflow-hidden">
            <SettingsNav active={activeSection} onChange={setActiveSection} />
            <section className="flex-1 overflow-y-auto px-12 py-10" style={{ backgroundColor: '#0F1117' }}>
                <div className="max-w-[720px] mx-auto">
                    <ContentPanel activeSection={activeSection} />
                </div>
            </section>
        </div>
    );
}
