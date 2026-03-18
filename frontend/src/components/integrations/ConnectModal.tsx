'use client';

/**
 * Spec10x — Connect Modal
 *
 * Modal component for connecting data sources.
 * Supports Zendesk (credential form) and CSV import (file upload).
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    DataSourceResponse,
    SourceConnectionResponse,
} from '@/lib/api';
import styles from './ConnectModal.module.css';

interface ConnectModalProps {
    source: DataSourceResponse;
    onClose: () => void;
    onConnected: () => void;
}

type ModalState = 'form' | 'validating' | 'success' | 'error';

// ── CSV Validation Types ─────────────────────────────────

interface CSVValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    preview_rows: Record<string, string>[];
    total_rows: number;
    columns_found: string[];
}

// ── API URL ──────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Component ────────────────────────────────────────────

export default function ConnectModal({ source, onClose, onConnected }: ConnectModalProps) {
    if (source.provider === 'csv_import') {
        return <CSVUploadModal source={source} onClose={onClose} onConnected={onConnected} />;
    }
    return <CredentialModal source={source} onClose={onClose} onConnected={onConnected} />;
}

// ── Zendesk Credential Modal ─────────────────────────────

function CredentialModal({ source, onClose, onConnected }: ConnectModalProps) {
    const { token } = useAuth();
    const [state, setState] = useState<ModalState>('form');
    const [errorMessage, setErrorMessage] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [email, setEmail] = useState('');
    const [apiToken, setApiToken] = useState('');

    const canSubmit = subdomain.trim() && email.trim() && apiToken.trim() && state === 'form';

    const handleConnect = async () => {
        if (!token || !canSubmit) return;

        setState('validating');
        setErrorMessage('');

        try {
            // Step 1: Create the connection
            const connection = await api.createSourceConnection(token, {
                data_source_id: source.id,
                secret_ref: apiToken.trim(),
                config_json: {
                    subdomain: subdomain.trim(),
                    email: email.trim(),
                },
            });

            // Step 2: Validate credentials
            const result = await api.validateSourceConnection(token, connection.id);

            if (result.status === 'connected') {
                setState('success');
                setTimeout(() => onConnected(), 1500);
            } else {
                setState('error');
                setErrorMessage(
                    result.last_error_summary || 'Validation failed — check your credentials'
                );
            }
        } catch (err: any) {
            setState('error');
            setErrorMessage(err?.message || 'Connection failed — please try again');
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <div className={styles.headerIcon}>🎫</div>
                        <div>
                            <h3 className={styles.headerTitle}>Connect {source.display_name}</h3>
                            <p className={styles.headerSubtitle}>
                                Enter your Zendesk API credentials
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {/* Status Messages */}
                    {state === 'validating' && (
                        <div className={`${styles.statusMessage} ${styles.statusValidating}`}>
                            <div className={styles.spinner} />
                            Validating credentials with Zendesk…
                        </div>
                    )}
                    {state === 'success' && (
                        <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                            ✓ Connected successfully
                        </div>
                    )}
                    {state === 'error' && (
                        <div className={`${styles.statusMessage} ${styles.statusError}`}>
                            ✕ {errorMessage}
                        </div>
                    )}

                    {/* Form */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Zendesk Subdomain</label>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="your-company"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value)}
                            disabled={state === 'validating' || state === 'success'}
                        />
                        <div className={styles.hint}>
                            The part before .zendesk.com in your Zendesk URL
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Admin Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="admin@your-company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={state === 'validating' || state === 'success'}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>API Token</label>
                        <input
                            className={styles.input}
                            type="password"
                            placeholder="Enter your Zendesk API token"
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            disabled={state === 'validating' || state === 'success'}
                        />
                        <div className={styles.hint}>
                            Found in Zendesk Admin → Channels → API → Settings
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleConnect}
                        disabled={!canSubmit}
                    >
                        {state === 'validating' ? (
                            <>
                                <div className={styles.spinner} />
                                Connecting…
                            </>
                        ) : state === 'error' ? (
                            'Try Again'
                        ) : (
                            'Connect'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── CSV Upload Modal ─────────────────────────────────────

function CSVUploadModal({ source, onClose, onConnected }: ConnectModalProps) {
    const { token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<CSVValidationResult | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.csv')) {
            setSelectedFile(file);
            setResult(null);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setResult(null);
        }
    };

    const handleValidate = async () => {
        if (!token || !selectedFile) return;

        setValidating(true);
        try {
            const validationResult = await api.validateSurveyCSV(token, selectedFile);
            setResult(validationResult);
        } catch (err: any) {
            setResult({
                valid: false,
                errors: [err?.message || 'Failed to validate CSV file'],
                warnings: [],
                preview_rows: [],
                total_rows: 0,
                columns_found: [],
            });
        } finally {
            setValidating(false);
        }
    };

    const handleDownloadTemplate = async () => {
        if (!token) return;
        try {
            const blob = await api.downloadSurveyTemplate(token);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'spec10x_survey_template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download template', err);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <div className={styles.headerIcon}>📊</div>
                        <div>
                            <h3 className={styles.headerTitle}>Import Survey CSV</h3>
                            <p className={styles.headerSubtitle}>
                                Upload survey or NPS data to bring into Spec10x
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {!selectedFile ? (
                        <>
                            {/* Drop Zone */}
                            <div
                                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={styles.dropIcon}>📁</div>
                                <p className={styles.dropText}>
                                    Drop your CSV file here or click to browse
                                </p>
                                <p className={styles.dropHint}>
                                    .csv files up to 10MB
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <button
                                className={styles.templateLink}
                                onClick={handleDownloadTemplate}
                            >
                                📄 Download CSV template
                            </button>
                        </>
                    ) : (
                        <>
                            {/* File Selected */}
                            <div className={styles.fileName}>
                                📄 {selectedFile.name}
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => { setSelectedFile(null); setResult(null); }}
                                    style={{ fontSize: 14 }}
                                >
                                    ✕
                                </button>
                            </div>

                            {validating && (
                                <div className={`${styles.statusMessage} ${styles.statusValidating}`}>
                                    <div className={styles.spinner} />
                                    Validating CSV structure…
                                </div>
                            )}

                            {result && (
                                <div className={styles.validationResults}>
                                    {/* Summary */}
                                    <div className={styles.validationSummary}>
                                        <span className={`${styles.validationStat} ${result.valid ? styles.validationStatGood : styles.validationStatBad}`}>
                                            {result.valid ? '✓ Valid' : '✕ Invalid'}
                                        </span>
                                        <span className={styles.validationStat}>
                                            {result.total_rows} rows
                                        </span>
                                        {result.errors.length > 0 && (
                                            <span className={`${styles.validationStat} ${styles.validationStatBad}`}>
                                                {result.errors.length} errors
                                            </span>
                                        )}
                                        {result.warnings.length > 0 && (
                                            <span className={`${styles.validationStat} ${styles.validationStatWarn}`}>
                                                {result.warnings.length} warnings
                                            </span>
                                        )}
                                    </div>

                                    {/* Errors */}
                                    {result.errors.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {result.errors.slice(0, 5).map((err, i) => (
                                                <li key={i} className={styles.errorItem}>
                                                    <span>⚠️</span> {err}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Warnings */}
                                    {result.warnings.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {result.warnings.slice(0, 3).map((w, i) => (
                                                <li key={i} className={styles.warningItem}>
                                                    <span>⚡</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Preview Table */}
                                    {result.preview_rows.length > 0 && (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className={styles.previewTable}>
                                                <thead>
                                                    <tr>
                                                        {result.columns_found.slice(0, 4).map((col) => (
                                                            <th key={col}>{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.preview_rows.slice(0, 3).map((row, i) => (
                                                        <tr key={i}>
                                                            {result.columns_found.slice(0, 4).map((col) => (
                                                                <td key={col}>{row[col] || '—'}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    {selectedFile && !result && (
                        <button
                            className={styles.submitBtn}
                            onClick={handleValidate}
                            disabled={validating}
                        >
                            {validating ? (
                                <>
                                    <div className={styles.spinner} />
                                    Validating…
                                </>
                            ) : (
                                'Validate CSV'
                            )}
                        </button>
                    )}
                    {result?.valid && (
                        <button
                            className={styles.submitBtn}
                            onClick={() => {
                                // Sprint 3: implement actual import
                                onConnected();
                            }}
                        >
                            Import {result.total_rows} Rows
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
