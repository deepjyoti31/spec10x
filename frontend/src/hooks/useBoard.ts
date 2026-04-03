'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, BoardThemeCardResponse } from '@/lib/api';

interface UseBoardReturn {
  pinned: BoardThemeCardResponse[];
  investigate: BoardThemeCardResponse[];
  monitoring: BoardThemeCardResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pinTheme: (id: string) => Promise<void>;
  unpinTheme: (id: string) => Promise<void>;
}

export function useBoard(): UseBoardReturn {
  const { token, loading: authLoading } = useAuth();

  const [allThemes, setAllThemes] = useState<BoardThemeCardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setAllThemes([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const themes = await api.getThemeBoard(token);
      setAllThemes(themes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    void fetchBoard();
  }, [authLoading, fetchBoard]);

  const refetch = useCallback(async () => {
    await fetchBoard();
  }, [fetchBoard]);

  const pinTheme = useCallback(async (id: string) => {
    if (!token) throw new Error('Not authenticated');
    await api.updateTheme(token, id, { priority_state: 'pinned' });
    await fetchBoard();
  }, [token, fetchBoard]);

  const unpinTheme = useCallback(async (id: string) => {
    if (!token) throw new Error('Not authenticated');
    await api.updateTheme(token, id, { priority_state: 'default' });
    await fetchBoard();
  }, [token, fetchBoard]);

  const pinned = allThemes.filter(t => t.priority_state === 'pinned');
  const investigate = allThemes.filter(t => t.priority_state === 'default');
  const monitoring = allThemes.filter(t => t.priority_state === 'monitoring');

  return { pinned, investigate, monitoring, loading, error, refetch, pinTheme, unpinTheme };
}
