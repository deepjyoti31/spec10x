'use client';

import React, { useEffect, useRef, useState } from 'react';

import { ZendeskCredentials } from '@/hooks/useIntegrations';
import { SurveyImportHistoryItem, SurveyImportValidationResponse } from '@/lib/api';

interface ConnectModalProps {
  open: boolean;
  step: 'form' | 'validating' | 'success' | 'error';
  error: string | null;
  provider: string | null;
  onClose: () => void;
  onSubmit: (credentials: ZendeskCredentials) => Promise<void>;
  onValidateCsv: (file: File) => Promise<SurveyImportValidationResponse>;
  onSubmitCsv: (file: File) => Promise<void>;
  surveyImportHistory: SurveyImportHistoryItem[];
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0c0e14',
  border: '1px solid rgba(66,71,83,0.4)',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#F0F0F3',
  fontSize: 13,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#8B8D97',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
};

function ZendeskForm({
  step,
  error,
  onSubmit,
}: {
  step: ConnectModalProps['step'];
  error: string | null;
  onSubmit: (credentials: ZendeskCredentials) => Promise<void>;
}) {
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'form') firstInputRef.current?.focus();
  }, [step]);

  const isBusy = step === 'validating';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isBusy) return;
    void onSubmit({ subdomain: subdomain.trim(), email: email.trim(), apiToken });
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#03363D' }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>support</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Connect Zendesk</h3>
          <p className="text-[12px] text-[#5A5C66] mt-0.5">Enter your Zendesk API credentials</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label style={labelStyle}>Subdomain</label>
          <input
            ref={firstInputRef}
            type="text"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value)}
            placeholder="your-company"
            disabled={isBusy}
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(175,198,255,0.4)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />
          <p className="text-[11px] text-[#5A5C66] mt-1.5">
            {subdomain ? `${subdomain}.zendesk.com` : 'your-company.zendesk.com'}
          </p>
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={isBusy}
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(175,198,255,0.4)')}
            onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
          />
        </div>

        <div>
          <label style={labelStyle}>API Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder="••••••••••••••••"
              disabled={isBusy}
              required
              style={{ ...inputStyle, paddingRight: 40 }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(175,198,255,0.4)')}
              onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A5C66] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = '#8B8D97')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5A5C66')}
              tabIndex={-1}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {showToken ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <p className="text-[11px] text-[#5A5C66] mt-1.5">
            Found in Zendesk Admin → Apps &amp; Integrations → APIs → API tokens
          </p>
        </div>

        {step === 'error' && error && (
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ backgroundColor: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy || !subdomain.trim() || !email.trim() || !apiToken}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all mt-1"
          style={{
            backgroundColor: isBusy ? 'rgba(175,198,255,0.15)' : '#afc6ff',
            color: isBusy ? '#afc6ff' : '#002D6C',
            cursor: isBusy ? 'default' : 'pointer',
          }}
        >
          {isBusy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              Validating credentials...
            </span>
          ) : (
            'Connect Zendesk'
          )}
        </button>
      </form>
    </>
  );
}

function CsvImportForm({
  step,
  error,
  historyItems,
  onValidate,
  onSubmit,
}: {
  step: ConnectModalProps['step'];
  error: string | null;
  historyItems: SurveyImportHistoryItem[];
  onValidate: (file: File) => Promise<SurveyImportValidationResponse>;
  onSubmit: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SurveyImportValidationResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = step === 'validating';
  const isBusy = isSubmitting || previewing;

  const resetPreview = () => {
    setPreview(null);
    setPreviewError(null);
  };

  const handleFile = (nextFile: File) => {
    resetPreview();
    if (!nextFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setPreviewError('Please choose a CSV (.csv) file.');
      return;
    }
    setFile(nextFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const nextFile = e.dataTransfer.files[0];
    if (nextFile) handleFile(nextFile);
  };

  const handlePreview = async () => {
    if (!file || isBusy) return;

    setPreviewError(null);
    setPreviewing(true);
    try {
      const result = await onValidate(file);
      setPreview(result);
      if (!result.valid) {
        setPreviewError('Please fix the CSV issues below before importing.');
      }
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || isBusy || !preview?.valid) return;
    void onSubmit(file);
  };

  const activeError = previewError ?? (step === 'error' ? error : null);
  const canImport = Boolean(file && preview?.valid && !isBusy);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(52,211,153,0.15)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#34D399' }}>upload_file</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Import CSV Survey / NPS</h3>
          <p className="text-[12px] text-[#5A5C66] mt-0.5">Preview rows and warnings before you import.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div
          onClick={() => !isBusy && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="rounded-lg flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-all"
          style={{
            border: `1px dashed ${dragging ? 'rgba(175,198,255,0.5)' : 'rgba(66,71,83,0.5)'}`,
            backgroundColor: dragging ? 'rgba(175,198,255,0.04)' : 'transparent',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: file ? '#34D399' : '#5A5C66' }}>
            {file ? 'check_circle' : 'upload'}
          </span>
          {file ? (
            <p className="text-sm font-medium text-white">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-[#8B8D97]">Drop your CSV here or <span style={{ color: '#afc6ff' }}>browse</span></p>
              <p className="text-[11px] text-[#5A5C66]">Max 10 MB · .csv only</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => {
            const nextFile = e.target.files?.[0];
            if (nextFile) handleFile(nextFile);
          }}
        />

        <div
          className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
          style={{ backgroundColor: '#0c0e14', color: '#8B8D97', border: '1px solid rgba(66,71,83,0.2)' }}
        >
          Nothing is imported until you preview and confirm. You can close this modal before confirming.
        </div>

        <a
          href="/api/survey-import/template"
          download
          className="text-[12px] flex items-center gap-1 w-fit transition-colors"
          style={{ color: '#5A5C66' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5A5C66')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
          Download CSV template
        </a>

        {activeError && (
          <div
            className="rounded-lg px-4 py-3 text-xs"
            style={{ backgroundColor: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            {activeError}
          </div>
        )}

        {preview && (
          <div
            className="rounded-lg p-4 space-y-4"
            style={{ backgroundColor: '#0c0e14', border: '1px solid rgba(66,71,83,0.2)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Preview</h4>
                <p className="text-[12px] text-[#8B8D97] mt-1">
                  {preview.total_rows} row{preview.total_rows === 1 ? '' : 's'} detected across {preview.columns_found.length} column{preview.columns_found.length === 1 ? '' : 's'}.
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest"
                style={{
                  backgroundColor: preview.valid ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                  color: preview.valid ? '#34D399' : '#F87171',
                }}
              >
                {preview.valid ? 'Ready' : 'Needs fixes'}
              </span>
            </div>

            {preview.warnings.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ffb77b] mb-2">Warnings</p>
                <ul className="space-y-1 text-[12px] text-[#B0B2BA]">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>- {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.errors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#F87171] mb-2">Errors</p>
                <ul className="space-y-1 text-[12px] text-[#F0B4B4]">
                  {preview.errors.map((previewItemError) => (
                    <li key={previewItemError}>- {previewItemError}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.preview_rows.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B8D97] mb-2">Mapped rows</p>
                <div className="space-y-2">
                  {preview.preview_rows.slice(0, 3).map((row, index) => (
                    <div
                      key={`${index}-${row.response_text ?? row.submitted_at ?? 'row'}`}
                      className="rounded-lg px-3 py-2"
                      style={{ backgroundColor: '#161820', border: '1px solid rgba(66,71,83,0.18)' }}
                    >
                      <p className="text-[12px] text-white line-clamp-2">
                        {row.response_text || 'No response text'}
                      </p>
                      <p className="text-[11px] text-[#8B8D97] mt-1">
                        {row.question || 'Survey Response'} · {row.submitted_at || 'Unknown date'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isBusy || !file}
            onClick={() => { void handlePreview(); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: '#1e2028',
              color: file ? '#c2c6d6' : 'rgba(194,198,214,0.35)',
              border: '1px solid rgba(66,71,83,0.3)',
              cursor: isBusy || !file ? 'default' : 'pointer',
            }}
          >
            {previewing ? 'Previewing...' : preview ? 'Refresh Preview' : 'Preview Import'}
          </button>

          <button
            type="submit"
            disabled={!canImport}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: isSubmitting ? 'rgba(175,198,255,0.15)' : '#afc6ff',
              color: isSubmitting ? '#afc6ff' : '#002D6C',
              cursor: canImport ? 'pointer' : 'default',
              opacity: canImport || isSubmitting ? 1 : 0.5,
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                Importing...
              </span>
            ) : (
              'Import CSV'
            )}
          </button>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#8B8D97]">
              Recent Imports
            </h4>
            <span className="text-[11px] text-[#5A5C66]">
              {historyItems.length} total
            </span>
          </div>
          {historyItems.length === 0 ? (
            <div className="rounded-lg px-4 py-3 text-[12px] text-[#5A5C66]" style={{ backgroundColor: '#0c0e14' }}>
              No CSV imports yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {historyItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: '#0c0e14', border: '1px solid rgba(66,71,83,0.18)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-medium text-white truncate">{item.import_name}</p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest"
                      style={{
                        backgroundColor: item.status === 'succeeded' ? 'rgba(52,211,153,0.1)' : item.status === 'failed' ? 'rgba(248,113,113,0.1)' : 'rgba(175,198,255,0.1)',
                        color: item.status === 'succeeded' ? '#34D399' : item.status === 'failed' ? '#F87171' : '#afc6ff',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B8D97] mt-1">
                    {item.records_created} created · {item.records_seen} seen
                  </p>
                  {item.error_summary && (
                    <p className="text-[11px] text-[#F87171] mt-1">{item.error_summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </>
  );
}

export default function ConnectModal({
  open,
  step,
  error,
  provider,
  onClose,
  onSubmit,
  onValidateCsv,
  onSubmitCsv,
  surveyImportHistory,
}: ConnectModalProps) {
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const isBusy = step === 'validating';
  const isSuccess = step === 'success';
  const isCsv = provider === 'csv_import';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl p-8 w-full relative"
        style={{
          maxWidth: 440,
          backgroundColor: '#161820',
          border: '1px solid rgba(255,255,255,0.06)',
          margin: '0 16px',
        }}
      >
        {!isBusy && !isSuccess && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[#5A5C66] transition-colors"
            onMouseEnter={e => (e.currentTarget.style.color = '#F0F0F3')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5A5C66')}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        )}

        {isSuccess && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 30, color: '#34D399' }}>check_circle</span>
            </div>
            <h3 className="text-lg font-bold text-white">{isCsv ? 'Import complete!' : 'Connected!'}</h3>
            <p className="text-sm text-[#8B8D97] text-center">
              {isCsv
                ? 'Your survey responses have been imported and are being processed.'
                : 'Zendesk has been connected. Your tickets will start syncing shortly.'}
            </p>
          </div>
        )}

        {!isSuccess && (
          isCsv ? (
            <CsvImportForm
              step={step}
              error={error}
              historyItems={surveyImportHistory}
              onValidate={onValidateCsv}
              onSubmit={onSubmitCsv}
            />
          ) : (
            <ZendeskForm step={step} error={error} onSubmit={onSubmit} />
          )
        )}
      </div>
    </div>
  );
}
