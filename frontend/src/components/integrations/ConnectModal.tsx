'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    DataSourceResponse,
    SurveyImportConfirmResponse,
} from '@/lib/api';
import styles from './ConnectModal.module.css';

interface ConnectModalProps {
    source: DataSourceResponse;
    onClose: () => void;
    onConnected: () => void;
}

type ModalState = 'form' | 'validating' | 'success' | 'error';

interface CSVValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    preview_rows: Record<string, string>[];
    total_rows: number;
    columns_found: string[];
}

export default function ConnectModal({ source, onClose, onConnected }: ConnectModalProps) {
    if (source.provider === 'csv_import') {
        return <CSVUploadModal source={source} onClose={onClose} onConnected={onConnected} />;
    }
    return <CredentialModal source={source} onClose={onClose} onConnected={onConnected} />;
}

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
            const connection = await api.createSourceConnection(token, {
                data_source_id: source.id,
                secret_ref: apiToken.trim(),
                config_json: {
                    subdomain: subdomain.trim(),
                    email: email.trim(),
                },
            });

            const result = await api.validateSourceConnection(token, connection.id);

            if (result.status === 'connected') {
                setState('success');
                setTimeout(() => onConnected(), 1200);
            } else {
                setState('error');
                setErrorMessage(
                    result.last_error_summary || 'Validation failed. Check your credentials.'
                );
            }
        } catch (err) {
            setState('error');
            setErrorMessage(err instanceof Error ? err.message : 'Connection failed.');
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <div className={styles.headerIcon}>ZD</div>
                        <div>
                            <h3 className={styles.headerTitle}>Connect {source.display_name}</h3>
                            <p className={styles.headerSubtitle}>Enter your Zendesk API credentials</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        x
                    </button>
                </div>

                <div className={styles.body}>
                    {state === 'validating' && (
                        <div className={`${styles.statusMessage} ${styles.statusValidating}`}>
                            <div className={styles.spinner} />
                            Validating credentials with Zendesk...
                        </div>
                    )}
                    {state === 'success' && (
                        <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                            Connection established successfully.
                        </div>
                    )}
                    {state === 'error' && (
                        <div className={`${styles.statusMessage} ${styles.statusError}`}>
                            {errorMessage}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Zendesk Subdomain</label>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="your-company"
                            value={subdomain}
                            onChange={(event) => setSubdomain(event.target.value)}
                            disabled={state === 'validating' || state === 'success'}
                        />
                        <div className={styles.hint}>
                            The part before `.zendesk.com` in your Zendesk URL.
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Admin Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="admin@your-company.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
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
                            onChange={(event) => setApiToken(event.target.value)}
                            disabled={state === 'validating' || state === 'success'}
                        />
                        <div className={styles.hint}>
                            Zendesk Admin {'>'} Channels {'>'} API {'>'} Settings
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    <button className={styles.submitBtn} onClick={handleConnect} disabled={!canSubmit}>
                        {state === 'validating' ? (
                            <>
                                <div className={styles.spinner} />
                                Connecting...
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

function CSVUploadModal({ source, onClose, onConnected }: ConnectModalProps) {
    const { token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [validating, setValidating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<CSVValidationResult | null>(null);
    const [importResult, setImportResult] = useState<SurveyImportConfirmResponse | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const handleDrag = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);

        const file = event.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.csv')) {
            setSelectedFile(file);
            setResult(null);
            setImportResult(null);
            setImportError(null);
        }
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setResult(null);
        setImportResult(null);
        setImportError(null);
    };

    const handleValidate = async () => {
        if (!token || !selectedFile) return;
        setValidating(true);
        setImportError(null);
        try {
            const validationResult = await api.validateSurveyCSV(token, selectedFile);
            setResult(validationResult);
        } catch (err) {
            setResult({
                valid: false,
                errors: [err instanceof Error ? err.message : 'Failed to validate CSV file'],
                warnings: [],
                preview_rows: [],
                total_rows: 0,
                columns_found: [],
            });
        } finally {
            setValidating(false);
        }
    };

    const handleImport = async () => {
        if (!token || !selectedFile || !result?.valid) return;
        setImporting(true);
        setImportError(null);
        try {
            const confirmed = await api.confirmSurveyImport(token, selectedFile);
            setImportResult(confirmed);
            setTimeout(() => onConnected(), 1200);
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Import failed.');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        if (!token) return;
        try {
            const blob = await api.downloadSurveyTemplate(token);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'spec10x_survey_template.csv';
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download template', err);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <div className={styles.headerIcon}>CSV</div>
                        <div>
                            <h3 className={styles.headerTitle}>Import {source.display_name}</h3>
                            <p className={styles.headerSubtitle}>
                                Validate and import survey or NPS CSV evidence.
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        x
                    </button>
                </div>

                <div className={styles.body}>
                    {importing && (
                        <div className={`${styles.statusMessage} ${styles.statusValidating}`}>
                            <div className={styles.spinner} />
                            Importing CSV evidence...
                        </div>
                    )}

                    {importResult && (
                        <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                            Imported {importResult.records_seen} rows. Created {importResult.records_created}
                            {' '}signal(s) and updated {importResult.records_updated}.
                        </div>
                    )}

                    {importError && (
                        <div className={`${styles.statusMessage} ${styles.statusError}`}>
                            {importError}
                        </div>
                    )}

                    {!selectedFile ? (
                        <>
                            <div
                                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={styles.dropIcon}>CSV</div>
                                <p className={styles.dropText}>Drop your CSV file here or click to browse</p>
                                <p className={styles.dropHint}>CSV files up to 10MB</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <button className={styles.templateLink} onClick={handleDownloadTemplate}>
                                Download CSV template
                            </button>
                        </>
                    ) : (
                        <>
                            <div className={styles.fileName}>
                                <span>{selectedFile.name}</span>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setResult(null);
                                        setImportResult(null);
                                        setImportError(null);
                                    }}
                                    style={{ fontSize: 14 }}
                                >
                                    x
                                </button>
                            </div>

                            {validating && (
                                <div className={`${styles.statusMessage} ${styles.statusValidating}`}>
                                    <div className={styles.spinner} />
                                    Validating CSV structure...
                                </div>
                            )}

                            {result && (
                                <div className={styles.validationResults}>
                                    <div className={styles.validationSummary}>
                                        <span className={`${styles.validationStat} ${result.valid ? styles.validationStatGood : styles.validationStatBad}`}>
                                            {result.valid ? 'Valid' : 'Invalid'}
                                        </span>
                                        <span className={styles.validationStat}>{result.total_rows} rows</span>
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

                                    {result.errors.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {result.errors.slice(0, 5).map((error, index) => (
                                                <li key={index} className={styles.errorItem}>
                                                    {error}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {result.warnings.length > 0 && (
                                        <ul className={styles.errorList}>
                                            {result.warnings.slice(0, 3).map((warning, index) => (
                                                <li key={index} className={styles.warningItem}>
                                                    {warning}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {result.preview_rows.length > 0 && (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className={styles.previewTable}>
                                                <thead>
                                                    <tr>
                                                        {result.columns_found.slice(0, 4).map((column) => (
                                                            <th key={column}>{column}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.preview_rows.slice(0, 3).map((row, rowIndex) => (
                                                        <tr key={rowIndex}>
                                                            {result.columns_found.slice(0, 4).map((column) => (
                                                                <td key={column}>{row[column] || '-'}</td>
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

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        {importResult ? 'Close' : 'Cancel'}
                    </button>

                    {selectedFile && !result && (
                        <button className={styles.submitBtn} onClick={handleValidate} disabled={validating}>
                            {validating ? (
                                <>
                                    <div className={styles.spinner} />
                                    Validating...
                                </>
                            ) : (
                                'Validate CSV'
                            )}
                        </button>
                    )}

                    {result?.valid && !importResult && (
                        <button className={styles.submitBtn} onClick={handleImport} disabled={importing}>
                            {importing ? (
                                <>
                                    <div className={styles.spinner} />
                                    Importing...
                                </>
                            ) : (
                                `Import ${result.total_rows} Rows`
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
