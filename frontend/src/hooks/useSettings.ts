'use client';

/**
 * Spec10x — Settings Hooks
 *
 * All data-fetching and mutation logic for the Settings page.
 * Each hook maps to one settings panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { api, LimitsResponse, SurveyImportHistoryItem } from '@/lib/api';
import { useAuth } from './useAuth';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

// ─────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────

export function useProfileSettings() {
  const { user, token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Local optimistic name for instant UI feedback after save
  const [localName, setLocalName] = useState<string | null>(null);

  // Password change
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const saveName = useCallback(
    async (name: string) => {
      if (!token) return;
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      try {
        await api.updateMe(token, { name });
        setLocalName(name);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [token]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const firebaseUser = getAuth().currentUser;
      if (!firebaseUser || !firebaseUser.email) {
        setPwError('Not authenticated');
        return;
      }
      setPwSaving(true);
      setPwError(null);
      setPwSuccess(false);
      try {
        // Re-authenticate first (required by Firebase for password change)
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
        setPwSuccess(true);
        setTimeout(() => setPwSuccess(false), 3000);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'auth/wrong-password') {
          setPwError('Current password is incorrect');
        } else if (code === 'auth/weak-password') {
          setPwError('New password must be at least 6 characters');
        } else {
          setPwError(err instanceof Error ? err.message : 'Failed to update password');
        }
      } finally {
        setPwSaving(false);
      }
    },
    []
  );

  return {
    user,
    localName,
    saving,
    saveError,
    saveSuccess,
    saveName,
    pwSaving,
    pwError,
    pwSuccess,
    changePassword,
  };
}

// ─────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────

export function useBillingSettings() {
  const { token } = useAuth();
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getLimits(token)
      .then(setLimits)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return { limits, loading, error };
}

// ─────────────────────────────────────────────────────────
// Data Management
// ─────────────────────────────────────────────────────────

export function useDataSettings() {
  const { token } = useAuth();
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'insights' | 'feed' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getLimits(token)
      .then(setLimits)
      .finally(() => setLoading(false));
  }, [token]);

  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportInsights = useCallback(async () => {
    if (!token) return;
    setExporting('insights');
    setExportError(null);
    try {
      const md = await api.exportInsights(token);
      downloadMarkdown(md, 'spec10x-insights.md');
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }, [token]);

  const exportFeed = useCallback(async () => {
    if (!token) return;
    setExporting('feed');
    setExportError(null);
    try {
      const md = await api.exportFeed(token);
      downloadMarkdown(md, 'spec10x-feed.md');
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }, [token]);

  return { limits, loading, exporting, exportError, exportInsights, exportFeed };
}

// ─────────────────────────────────────────────────────────
// Import / Export (Survey CSV)
// ─────────────────────────────────────────────────────────

export type ImportStep = 'idle' | 'validating' | 'preview' | 'importing' | 'done' | 'error';

export interface SurveyPreview {
  row_count: number;
  column_names: string[];
  preview_rows: Record<string, string>[];
  warnings: string[];
  is_valid: boolean;
  error_message?: string;
}

export function useImportExportSettings() {
  const { token } = useAuth();
  const [step, setStep] = useState<ImportStep>('idle');
  const [preview, setPreview] = useState<SurveyPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ records_created: number; records_updated: number } | null>(null);
  const [history, setHistory] = useState<SurveyImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await api.getSurveyImportHistory(token);
      setHistory(res.imports);
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const validateFile = useCallback(
    async (file: File) => {
      if (!token) return;
      setPendingFile(file);
      setStep('validating');
      setError(null);
      try {
        const res = await api.validateSurveyCSV(token, file);
        setPreview(res);
        setStep('preview');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Validation failed');
        setStep('error');
      }
    },
    [token]
  );

  const confirmImport = useCallback(async () => {
    if (!token || !pendingFile) return;
    setStep('importing');
    setError(null);
    try {
      const res = await api.confirmSurveyImport(token, pendingFile);
      setImportResult({ records_created: res.records_created, records_updated: res.records_updated });
      setStep('done');
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
      setStep('error');
    }
  }, [token, pendingFile, loadHistory]);

  const reset = useCallback(() => {
    setStep('idle');
    setPreview(null);
    setPendingFile(null);
    setImportResult(null);
    setError(null);
  }, []);

  const downloadTemplate = useCallback(async () => {
    if (!token) return;
    try {
      const blob = await api.downloadSurveyTemplate(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spec10x-survey-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, [token]);

  return {
    step,
    preview,
    importResult,
    history,
    historyLoading,
    error,
    validateFile,
    confirmImport,
    reset,
    downloadTemplate,
  };
}

// ─────────────────────────────────────────────────────────
// Danger Zone
// ─────────────────────────────────────────────────────────

export function useDangerZone() {
  const { token, logout } = useAuth();
  const [deletingData, setDeletingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataDeleted, setDataDeleted] = useState(false);

  const deleteData = useCallback(async () => {
    if (!token) return;
    setDeletingData(true);
    setError(null);
    try {
      await api.deleteData(token);
      setDataDeleted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete data');
    } finally {
      setDeletingData(false);
    }
  }, [token]);

  const deleteAccount = useCallback(async () => {
    if (!token) return;
    setDeletingAccount(true);
    setError(null);
    try {
      await api.deleteAccount(token);
      await logout();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete account');
      setDeletingAccount(false);
    }
  }, [token, logout]);

  return { deletingData, deletingAccount, error, dataDeleted, deleteData, deleteAccount };
}
