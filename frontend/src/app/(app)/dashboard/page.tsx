/**
 * Spec10x — Dashboard Page
 *
 * Three-panel Insight Dashboard:
 * Left sidebar (interview library) + Center (theme cards) + Right (detail panel)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useInterviews } from '@/hooks/useInterviews';
import { useThemes } from '@/hooks/useThemes';
import { api, ThemeResponse, InterviewResponse } from '@/lib/api';
import InterviewSidebar from '@/components/dashboard/InterviewSidebar';
import ThemeArea from '@/components/dashboard/ThemeArea';
import DetailPanel from '@/components/dashboard/DetailPanel';
import UploadModal from '@/components/upload/UploadModal';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { token } = useAuth();
    const { interviews, loading: interviewsLoading, sort: interviewSort, setSort: setInterviewSort, refetch: refetchInterviews } = useInterviews();
    const { activeThemes, previousThemes, loading: themesLoading, sort: themeSort, setSort: setThemeSort, refetch: refetchThemes } = useThemes();

    const [selectedTheme, setSelectedTheme] = useState<ThemeResponse | null>(null);
    const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const handleThemeSelect = useCallback((theme: ThemeResponse) => {
        setSelectedTheme(theme);
        setSelectedInterview(null);
    }, []);

    const handleInterviewSelect = useCallback((interview: InterviewResponse) => {
        setSelectedInterview(interview);
        setSelectedTheme(null);
    }, []);

    const handleThemeRename = useCallback(async (id: string, name: string) => {
        if (!token) return;
        try {
            await api.renameTheme(token, id, name);
            refetchThemes();
            if (selectedTheme?.id === id) {
                setSelectedTheme((prev) => prev ? { ...prev, name } : null);
            }
        } catch (err) {
            console.error('Failed to rename theme:', err);
        }
    }, [token, selectedTheme, refetchThemes]);

    const handleUploadComplete = useCallback(() => {
        setIsUploadModalOpen(false);
        refetchInterviews();
        refetchThemes();
    }, [refetchInterviews, refetchThemes]);

    const handleLoadSampleData = useCallback(async () => {
        if (!token) return;
        try {
            await api.loadSampleData(token);
            refetchInterviews();
            refetchThemes();
        } catch (err) {
            console.error('Failed to load sample data:', err);
        }
    }, [token, refetchInterviews, refetchThemes]);

    return (
        <>
            <div className={styles.dashboard}>
                {/* Left Sidebar — Interview Library */}
                <InterviewSidebar
                    interviews={interviews}
                    loading={interviewsLoading}
                    selectedId={selectedInterview?.id || null}
                    onSelect={handleInterviewSelect}
                    onUploadClick={() => setIsUploadModalOpen(true)}
                    sort={interviewSort}
                    onSortChange={setInterviewSort}
                    totalInsights={0}
                    totalThemes={activeThemes.length + previousThemes.length}
                />

                {/* Center — Theme Area */}
                <ThemeArea
                    activeThemes={activeThemes}
                    previousThemes={previousThemes}
                    loading={themesLoading}
                    sort={themeSort}
                    onSortChange={setThemeSort}
                    selectedThemeId={selectedTheme?.id || null}
                    onThemeSelect={handleThemeSelect}
                    onThemeRename={handleThemeRename}
                    onUploadClick={() => setIsUploadModalOpen(true)}
                    onLoadSampleData={handleLoadSampleData}
                    interviewCount={interviews.length}
                />

                {/* Right — Detail Panel */}
                <DetailPanel
                    selectedTheme={selectedTheme}
                    selectedInterview={selectedInterview}
                    totalInterviews={interviews.length}
                    totalThemes={activeThemes.length}
                />
            </div>

            {/* Upload Modal */}
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onComplete={handleUploadComplete}
            />
        </>
    );
}
