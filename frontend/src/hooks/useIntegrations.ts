'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, DataSourceResponse, SourceConnectionResponse } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZendeskCredentials {
  subdomain: string;
  email: string;
  apiToken: string;
}

type ConnectModalStep = 'form' | 'validating' | 'success' | 'error';

interface UseIntegrationsReturn {
  connections: SourceConnectionResponse[];
  dataSources: DataSourceResponse[];
  loading: boolean;
  error: string | null;
  syncingIds: Set<string>;
  disconnectingIds: Set<string>;
  connectModalOpen: boolean;
  connectModalDataSourceId: string | null;
  connectModalStep: ConnectModalStep;
  connectModalError: string | null;
  refetch: () => Promise<void>;
  syncNow: (connectionId: string) => Promise<void>;
  disconnect: (connectionId: string) => Promise<void>;
  openConnectModal: (dataSourceId: string) => void;
  closeConnectModal: () => void;
  submitConnect: (credentials: ZendeskCredentials) => Promise<void>;
  submitCsvConnect: (file: File) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIntegrations(): UseIntegrationsReturn {
  const { token, loading: authLoading } = useAuth();

  const [connections, setConnections] = useState<SourceConnectionResponse[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [disconnectingIds, setDisconnectingIds] = useState<Set<string>>(new Set());

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectModalDataSourceId, setConnectModalDataSourceId] = useState<string | null>(null);
  const [connectModalStep, setConnectModalStep] = useState<ConnectModalStep>('form');
  const [connectModalError, setConnectModalError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setConnections([]);
      setDataSources([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [allConnections, allSources] = await Promise.all([
        api.listSourceConnections(token),
        api.listDataSources(token),
      ]);

      // Exclude fully disconnected connections from the connected section
      setConnections(allConnections.filter(c => c.status !== 'disconnected'));
      setDataSources(allSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    void fetchAll();
  }, [authLoading, fetchAll]);

  const refetch = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // ── Sync Now ───────────────────────────────────────────────────────────────

  const syncNow = useCallback(async (connectionId: string) => {
    if (!token) throw new Error('Not authenticated');

    setSyncingIds(prev => new Set(prev).add(connectionId));
    try {
      const syncRun = await api.triggerSourceConnectionSync(token, connectionId);
      await fetchAll();
      if (syncRun.status === 'failed') {
        throw new Error(syncRun.error_summary ?? 'Sync failed');
      }
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  }, [token, fetchAll]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async (connectionId: string) => {
    if (!token) throw new Error('Not authenticated');

    setDisconnectingIds(prev => new Set(prev).add(connectionId));
    try {
      await api.disconnectSourceConnection(token, connectionId);
      await fetchAll();
    } finally {
      setDisconnectingIds(prev => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  }, [token, fetchAll]);

  // ── Connect Modal ──────────────────────────────────────────────────────────

  const openConnectModal = useCallback((dataSourceId: string) => {
    setConnectModalDataSourceId(dataSourceId);
    setConnectModalStep('form');
    setConnectModalError(null);
    setConnectModalOpen(true);
  }, []);

  const closeConnectModal = useCallback(() => {
    setConnectModalOpen(false);
    setConnectModalDataSourceId(null);
    setConnectModalStep('form');
    setConnectModalError(null);
  }, []);

  const submitConnect = useCallback(async (credentials: ZendeskCredentials) => {
    if (!token) throw new Error('Not authenticated');
    if (!connectModalDataSourceId) throw new Error('No data source selected');

    setConnectModalError(null);

    try {
      // Guard: prevent creating a duplicate connection for the same provider
      const targetSource = dataSources.find(d => d.id === connectModalDataSourceId);
      if (targetSource) {
        const alreadyConnected = connections.some(
          c => c.data_source.provider === targetSource.provider && c.status !== 'disconnected'
        );
        if (alreadyConnected) {
          throw new Error(`${targetSource.display_name} is already connected. Disconnect it first to reconnect.`);
        }
      }

      // Store only the raw API token — the connector builds the "email/token:token" format itself
      const secretRef = credentials.apiToken;

      const newConnection = await api.createSourceConnection(token, {
        data_source_id: connectModalDataSourceId,
        secret_ref: secretRef,
        config_json: { subdomain: credentials.subdomain, email: credentials.email },
      });

      setConnectModalStep('validating');

      await api.validateSourceConnection(token, newConnection.id);

      // Kick off initial sync immediately after successful connection
      await api.triggerSourceConnectionSync(token, newConnection.id);

      setConnectModalStep('success');
      await fetchAll();
    } catch (err) {
      setConnectModalStep('error');
      setConnectModalError(
        err instanceof Error ? err.message : 'Connection failed. Please check your credentials.'
      );
    }
  }, [token, connectModalDataSourceId, connections, dataSources, fetchAll]);

  const submitCsvConnect = useCallback(async (file: File) => {
    if (!token) throw new Error('Not authenticated');

    setConnectModalError(null);
    setConnectModalStep('validating');

    try {
      await api.confirmSurveyImport(token, file);
      setConnectModalStep('success');
      await fetchAll();
    } catch (err) {
      setConnectModalStep('error');
      setConnectModalError(
        err instanceof Error ? err.message : 'Import failed. Please check your file and try again.'
      );
    }
  }, [token, fetchAll]);

  return {
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
    refetch,
    syncNow,
    disconnect,
    openConnectModal,
    closeConnectModal,
    submitConnect,
    submitCsvConnect,
  };
}
