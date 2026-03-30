'use client';

import { useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, ThemeExplorerQuery, ThemeExplorerResponse } from '@/lib/api';

interface UseInsightsExplorerReturn {
  explorer: ThemeExplorerResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function buildRequestKey(filters: ThemeExplorerQuery): string {
  return JSON.stringify({
    sort: filters.sort ?? 'urgency',
    sources: [...(filters.sources ?? [])].sort(),
    sentiment: filters.sentiment ?? null,
    date_from: filters.date_from ?? null,
    date_to: filters.date_to ?? null,
    selected_theme_id: filters.selected_theme_id ?? null,
  });
}

function parseRequestKey(key: string): ThemeExplorerQuery {
  return JSON.parse(key) as ThemeExplorerQuery;
}

export function useInsightsExplorer(
  filters: ThemeExplorerQuery
): UseInsightsExplorerReturn {
  const { token } = useAuth();
  const [explorer, setExplorer] = useState<ThemeExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestKey = buildRequestKey(filters);

  async function fetchExplorer() {
    const authToken = token;

    if (!authToken) {
      setLoading(false);
      return;
    }

    const requestToken: string = authToken;
    setLoading(true);
    setError(null);
    try {
      const nextExplorer = await api.getThemeExplorer(
        requestToken,
        parseRequestKey(requestKey)
      );
      setExplorer(nextExplorer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const authToken = token;

    if (!authToken) return;

    const requestToken: string = authToken;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const nextExplorer = await api.getThemeExplorer(
          requestToken,
          parseRequestKey(requestKey)
        );
        if (!cancelled) {
          setExplorer(nextExplorer);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load insights');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token, requestKey]);

  return {
    explorer,
    loading,
    error,
    refetch: fetchExplorer,
  };
}
