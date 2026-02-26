/**
 * Spec10x — useThemes Hook
 *
 * Fetches and caches the themes list with sort support.
 * Separates active vs previous themes.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api, ThemeResponse } from '@/lib/api';

interface UseThemesReturn {
    themes: ThemeResponse[];
    activeThemes: ThemeResponse[];
    previousThemes: ThemeResponse[];
    loading: boolean;
    error: string | null;
    sort: string;
    setSort: (sort: string) => void;
    refetch: () => Promise<void>;
}

export function useThemes(): UseThemesReturn {
    const { token } = useAuth();
    const [themes, setThemes] = useState<ThemeResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState('urgency');

    const fetchThemes = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.listThemes(token, sort);
            setThemes(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load themes');
        } finally {
            setLoading(false);
        }
    }, [token, sort]);

    useEffect(() => {
        fetchThemes();
    }, [fetchThemes]);

    const activeThemes = themes.filter((t) => t.status === 'active');
    const previousThemes = themes.filter((t) => t.status === 'previous');

    return {
        themes,
        activeThemes,
        previousThemes,
        loading,
        error,
        sort,
        setSort,
        refetch: fetchThemes,
    };
}
