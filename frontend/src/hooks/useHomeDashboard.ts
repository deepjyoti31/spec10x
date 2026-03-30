'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './useAuth';
import { api, HomeDashboardResponse } from '@/lib/api';

interface UseHomeDashboardReturn {
    dashboard: HomeDashboardResponse | null;
    loading: boolean;
    error: string | null;
    sampleDataLoading: boolean;
    refetch: () => Promise<void>;
    loadSampleData: () => Promise<HomeDashboardResponse>;
}

export function useHomeDashboard(): UseHomeDashboardReturn {
    const { token } = useAuth();
    const [dashboard, setDashboard] = useState<HomeDashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sampleDataLoading, setSampleDataLoading] = useState(false);

    const fetchDashboard = useCallback(async () => {
        if (!token) return;

        setLoading(true);
        setError(null);
        try {
            const nextDashboard = await api.getHomeDashboard(token);
            setDashboard(nextDashboard);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        void fetchDashboard();
    }, [fetchDashboard, token]);

    const loadSampleData = useCallback(async () => {
        if (!token) {
            throw new Error('You must be signed in to load sample data');
        }

        setSampleDataLoading(true);
        try {
            await api.loadSampleData(token);
            const nextDashboard = await api.getHomeDashboard(token);
            setDashboard(nextDashboard);
            setError(null);
            return nextDashboard;
        } finally {
            setSampleDataLoading(false);
        }
    }, [token]);

    return {
        dashboard,
        loading,
        error,
        sampleDataLoading,
        refetch: fetchDashboard,
        loadSampleData,
    };
}
