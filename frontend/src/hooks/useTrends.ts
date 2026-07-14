'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, ThemeTrendsPageResponse } from '@/lib/api';

interface UseTrendsReturn {
  trends: ThemeTrendsPageResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTrends(): UseTrendsReturn {
  const { token, loading: authLoading } = useAuth();

  const [trends, setTrends] = useState<ThemeTrendsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setTrends(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.getThemeTrends(token);
      setTrends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    void fetchTrends();
  }, [authLoading, fetchTrends]);

  const refetch = useCallback(async () => {
    await fetchTrends();
  }, [fetchTrends]);

  return { trends, loading, error, refetch };
}
