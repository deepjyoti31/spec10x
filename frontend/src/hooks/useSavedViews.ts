'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, FeedFilters, SavedViewResponse } from '@/lib/api';

interface UseSavedViewsReturn {
  savedViews: SavedViewResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  saveView: (name: string, filters: FeedFilters) => Promise<void>;
  deleteView: (id: string) => Promise<void>;
}

export function useSavedViews(): UseSavedViewsReturn {
  const { token, loading: authLoading } = useAuth();

  const [savedViews, setSavedViews] = useState<SavedViewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedViews = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setSavedViews([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const views = await api.listSavedViews(token);
      setSavedViews(views);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved views');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    void fetchSavedViews();
  }, [authLoading, fetchSavedViews]);

  const refetch = useCallback(async () => {
    await fetchSavedViews();
  }, [fetchSavedViews]);

  const saveView = useCallback(
    async (name: string, filters: FeedFilters) => {
      if (!token) throw new Error('Not authenticated');
      await api.createSavedView(token, { name, filters });
      await fetchSavedViews();
    },
    [token, fetchSavedViews]
  );

  const deleteView = useCallback(
    async (id: string) => {
      if (!token) throw new Error('Not authenticated');
      await api.deleteSavedView(token, id);
      await fetchSavedViews();
    },
    [token, fetchSavedViews]
  );

  return { savedViews, loading, error, refetch, saveView, deleteView };
}
