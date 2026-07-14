'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, CollectionResponse } from '@/lib/api';

interface UseCollectionsReturn {
  collections: CollectionResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<CollectionResponse>;
  deleteCollection: (id: string) => Promise<void>;
}

export function useCollections(): UseCollectionsReturn {
  const { token, loading: authLoading } = useAuth();

  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setCollections([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await api.listCollections(token);
      setCollections(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (authLoading) return;
    void fetchCollections();
  }, [authLoading, fetchCollections]);

  const refetch = useCallback(async () => {
    await fetchCollections();
  }, [fetchCollections]);

  const createCollection = useCallback(
    async (name: string, description?: string) => {
      if (!token) throw new Error('Not authenticated');
      const created = await api.createCollection(token, { name, description });
      await fetchCollections();
      return created;
    },
    [token, fetchCollections]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      if (!token) throw new Error('Not authenticated');
      await api.deleteCollection(token, id);
      await fetchCollections();
    },
    [token, fetchCollections]
  );

  return { collections, loading, error, refetch, createCollection, deleteCollection };
}
