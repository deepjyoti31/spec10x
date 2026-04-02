'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from './useAuth';
import {
  api,
  FeedFilters,
  FeedSignalDetailResponse,
  FeedSignalResponse,
} from '@/lib/api';

interface UseFeedReturn {
  signals: FeedSignalResponse[] | null;
  selectedSignalId: string | null;
  selectedSignal: FeedSignalDetailResponse | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  detailError: string | null;
  exporting: boolean;
  refetch: () => Promise<void>;
  exportFeed: () => Promise<string>;
}

function buildRequestKey(filters: FeedFilters): string {
  return JSON.stringify({
    source: filters.source ?? null,
    sentiment: filters.sentiment ?? null,
    date_from: filters.date_from ?? null,
    date_to: filters.date_to ?? null,
  });
}

function parseRequestKey(key: string): FeedFilters {
  return JSON.parse(key) as FeedFilters;
}

export function useFeed(
  filters: FeedFilters,
  requestedSignalId: string | null
): UseFeedReturn {
  const { token, loading: authLoading } = useAuth();
  const [signals, setSignals] = useState<FeedSignalResponse[] | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<FeedSignalDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const requestKey = buildRequestKey(filters);

  const selectedSignalId = useMemo(() => {
    if (!signals || signals.length === 0) {
      return null;
    }

    if (requestedSignalId && signals.some((signal) => signal.id === requestedSignalId)) {
      return requestedSignalId;
    }

    return signals[0]?.id ?? null;
  }, [requestedSignalId, signals]);

  const fetchSignals = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setSignals(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextSignals = await api.listFeed(token, parseRequestKey(requestKey));
      setSignals(nextSignals);
    } catch (err) {
      setSignals(null);
      setError(err instanceof Error ? err.message : 'Failed to load feed signals');
    } finally {
      setLoading(false);
    }
  }, [authLoading, requestKey, token]);

  const fetchSelectedSignal = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!token || !selectedSignalId) {
      setSelectedSignal(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    setSelectedSignal(null);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const nextSignal = await api.getFeedSignal(token, selectedSignalId);
      setSelectedSignal(nextSignal);
    } catch (err) {
      setSelectedSignal(null);
      setDetailError(err instanceof Error ? err.message : 'Failed to load signal details');
    } finally {
      setDetailLoading(false);
    }
  }, [authLoading, selectedSignalId, token]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchSignals();
  }, [authLoading, fetchSignals]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchSelectedSignal();
  }, [authLoading, fetchSelectedSignal]);

  const refetch = useCallback(async () => {
    await fetchSignals();
    await fetchSelectedSignal();
  }, [fetchSelectedSignal, fetchSignals]);

  const exportFeed = useCallback(async () => {
    if (!token) {
      throw new Error('You must be signed in to export the feed');
    }

    setExporting(true);
    try {
      return await api.exportFeed(token, parseRequestKey(requestKey));
    } finally {
      setExporting(false);
    }
  }, [requestKey, token]);

  return {
    signals,
    selectedSignalId,
    selectedSignal,
    loading,
    detailLoading,
    error,
    detailError,
    exporting,
    refetch,
    exportFeed,
  };
}
