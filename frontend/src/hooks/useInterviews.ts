/**
 * Spec10x — useInterviews Hook
 *
 * Fetches and caches the interviews list with sort/filter support.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api, InterviewResponse } from '@/lib/api';

interface UseInterviewsReturn {
    interviews: InterviewResponse[];
    loading: boolean;
    error: string | null;
    sort: string;
    setSort: (sort: string) => void;
    refetch: () => Promise<void>;
}

export function useInterviews(): UseInterviewsReturn {
    const { token } = useAuth();
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState('recent');

    const fetchInterviews = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.listInterviews(token, sort);
            setInterviews(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load interviews');
        } finally {
            setLoading(false);
        }
    }, [token, sort]);

    useEffect(() => {
        fetchInterviews();
    }, [fetchInterviews]);

    return { interviews, loading, error, sort, setSort, refetch: fetchInterviews };
}
