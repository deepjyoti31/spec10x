'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import {
  api,
  SpecDetailResponse,
  SpecListItemResponse,
  SpecStatus,
  SpecUpdateRequest,
} from '@/lib/api';

interface UseSpecsReturn {
  specs: SpecListItemResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSpec: (themeId: string) => Promise<SpecDetailResponse>;
  deleteSpec: (id: string) => Promise<void>;
}

export function useSpecs(status?: SpecStatus): UseSpecsReturn {
  const { token, loading: authLoading } = useAuth();

  const [specs, setSpecs] = useState<SpecListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecs = useCallback(async () => {
    if (authLoading) return;

    if (!token) {
      setSpecs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await api.listSpecs(token, status);
      setSpecs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load specs');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token, status]);

  useEffect(() => {
    if (authLoading) return;
    void fetchSpecs();
  }, [authLoading, fetchSpecs]);

  const refetch = useCallback(async () => {
    await fetchSpecs();
  }, [fetchSpecs]);

  const createSpec = useCallback(
    async (themeId: string) => {
      if (!token) throw new Error('Not authenticated');
      const created = await api.createSpec(token, themeId);
      await fetchSpecs();
      return created;
    },
    [token, fetchSpecs]
  );

  const deleteSpec = useCallback(
    async (id: string) => {
      if (!token) throw new Error('Not authenticated');
      await api.deleteSpec(token, id);
      await fetchSpecs();
    },
    [token, fetchSpecs]
  );

  return { specs, loading, error, refetch, createSpec, deleteSpec };
}

interface UseSpecReturn {
  spec: SpecDetailResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSpec: (data: SpecUpdateRequest) => Promise<SpecDetailResponse>;
  regenerate: () => Promise<SpecDetailResponse>;
}

export function useSpec(id: string | null): UseSpecReturn {
  const { token, loading: authLoading } = useAuth();

  const [spec, setSpec] = useState<SpecDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpec = useCallback(async () => {
    if (authLoading || !id) return;

    if (!token) {
      setSpec(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const row = await api.getSpec(token, id);
      setSpec(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spec');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token, id]);

  useEffect(() => {
    if (authLoading) return;
    void fetchSpec();
  }, [authLoading, fetchSpec]);

  const refetch = useCallback(async () => {
    await fetchSpec();
  }, [fetchSpec]);

  const updateSpec = useCallback(
    async (data: SpecUpdateRequest) => {
      if (!token || !id) throw new Error('Not authenticated');
      const updated = await api.updateSpec(token, id, data);
      setSpec(updated);
      return updated;
    },
    [token, id]
  );

  const regenerate = useCallback(async () => {
    if (!token || !id) throw new Error('Not authenticated');
    const updated = await api.regenerateSpec(token, id);
    setSpec(updated);
    return updated;
  }, [token, id]);

  return { spec, loading, error, refetch, updateSpec, regenerate };
}
