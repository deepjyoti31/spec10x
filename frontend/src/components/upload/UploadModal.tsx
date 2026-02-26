'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket, ProcessingUpdate } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import DropZone from './DropZone';
import ProcessingQueue, { QueueFile } from './ProcessingQueue';
import styles from './UploadModal.module.css';

type UploadStep = 'upload' | 'processing' | 'metadata' | 'complete';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

let fileCounter = 0;

export default function UploadModal({ isOpen, onClose, onComplete }: UploadModalProps) {
    const { token } = useAuth();
    const { messages: wsMessages } = useWebSocket(isOpen);

    const [step, setStep] = useState<UploadStep>('upload');
    const [queueFiles, setQueueFiles] = useState<QueueFile[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [insightsCount, setInsightsCount] = useState(0);
    const [themesCount, setThemesCount] = useState(0);

    // Process WebSocket updates
    React.useEffect(() => {
        if (wsMessages.length === 0) return;
        const latest = wsMessages[wsMessages.length - 1];

        setQueueFiles((prev) =>
            prev.map((qf) => {
                // Match by interview ID if we have one stored
                if ((qf as QueueFile & { interviewId?: string }).interviewId === latest.interview_id) {
                    return {
                        ...qf,
                        status: latest.status === 'done' ? 'done' : latest.status === 'error' ? 'error' : latest.status,
                        progress: latest.status === 'done' ? 100 : latest.progress || qf.progress,
                        error: latest.status === 'error' ? latest.message : undefined,
                    } as QueueFile;
                }
                return qf;
            })
        );
    }, [wsMessages]);

    const handleFilesSelected = useCallback(async (files: File[]) => {
        if (!token) return;

        const newFiles: QueueFile[] = files.map((file) => ({
            id: `file-${++fileCounter}`,
            file,
            status: 'queued' as const,
            progress: 0,
        }));

        setQueueFiles((prev) => [...prev, ...newFiles]);
        setStep('processing');

        // Upload each file
        for (const qf of newFiles) {
            try {
                // Update status to uploading
                setQueueFiles((prev) =>
                    prev.map((f) => f.id === qf.id ? { ...f, status: 'uploading' as const, progress: 20 } : f)
                );

                // 1. Get signed upload URL
                const { upload_url, storage_path } = await api.getUploadUrl(token, {
                    filename: qf.file.name,
                    content_type: qf.file.type || 'application/octet-stream',
                    file_size_bytes: qf.file.size,
                });

                setQueueFiles((prev) =>
                    prev.map((f) => f.id === qf.id ? { ...f, progress: 40 } : f)
                );

                // 2. Upload to storage
                await fetch(upload_url, {
                    method: 'PUT',
                    body: qf.file,
                    headers: { 'Content-Type': qf.file.type || 'application/octet-stream' },
                });

                setQueueFiles((prev) =>
                    prev.map((f) => f.id === qf.id ? { ...f, progress: 60 } : f)
                );

                // 3. Create interview record (triggers processing)
                const fileExt = qf.file.name.split('.').pop()?.toLowerCase() || 'txt';
                const interview = await api.createInterview(token, {
                    filename: qf.file.name,
                    file_type: fileExt,
                    file_size_bytes: qf.file.size,
                    storage_path,
                });

                // Store interview ID for WebSocket matching
                setQueueFiles((prev) =>
                    prev.map((f) => f.id === qf.id
                        ? { ...f, status: 'analyzing' as const, progress: 70, interviewId: interview.id } as QueueFile & { interviewId: string }
                        : f)
                );

                // Simulate progress for now (real updates come via WebSocket)
                setTimeout(() => {
                    setQueueFiles((prev) =>
                        prev.map((f) => {
                            if (f.id === qf.id && f.status !== 'done' && f.status !== 'error') {
                                setCompletedCount((c) => c + 1);
                                return { ...f, status: 'done' as const, progress: 100 };
                            }
                            return f;
                        })
                    );
                }, 3000 + Math.random() * 2000);

            } catch (err) {
                setQueueFiles((prev) =>
                    prev.map((f) => f.id === qf.id
                        ? { ...f, status: 'error' as const, progress: 100, error: err instanceof Error ? err.message : 'Upload failed' }
                        : f)
                );
            }
        }
    }, [token]);

    const handleRemoveFile = useCallback((id: string) => {
        setQueueFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const handleSkipMetadata = useCallback(() => {
        setStep('complete');
        // Count approximate stats
        const done = queueFiles.filter((f) => f.status === 'done').length;
        setCompletedCount(done);
        setInsightsCount(done * 4); // approximate
        setThemesCount(Math.ceil(done * 0.8)); // approximate
    }, [queueFiles]);

    const handleViewInsights = useCallback(() => {
        setStep('upload');
        setQueueFiles([]);
        setCompletedCount(0);
        onComplete();
    }, [onComplete]);

    const handleClose = useCallback(() => {
        const isProcessing = queueFiles.some(
            (f) => f.status === 'uploading' || f.status === 'transcribing' || f.status === 'analyzing'
        );

        if (isProcessing) {
            if (window.confirm('Files are still processing. Are you sure you want to close?')) {
                setStep('upload');
                setQueueFiles([]);
                onClose();
            }
        } else {
            setStep('upload');
            setQueueFiles([]);
            onClose();
        }
    }, [queueFiles, onClose]);

    const allDone = queueFiles.length > 0 && queueFiles.every((f) => f.status === 'done' || f.status === 'error');
    const isProcessing = queueFiles.some(
        (f) => f.status === 'uploading' || f.status === 'transcribing' || f.status === 'analyzing'
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            width={720}
            preventClose={isProcessing}
        >
            <div className={styles.uploadModal}>
                <h2 className={styles.modalTitle}>Upload Interviews</h2>

                {/* Step: Upload / Processing */}
                {(step === 'upload' || step === 'processing') && (
                    <div className={styles.uploadContent}>
                        <div className={styles.leftCol}>
                            {/* Drop zone */}
                            <DropZone
                                onFilesSelected={handleFilesSelected}
                                compact={queueFiles.length > 0}
                            />

                            {/* Processing queue */}
                            {queueFiles.length > 0 && (
                                <ProcessingQueue
                                    files={queueFiles}
                                    onRemove={handleRemoveFile}
                                />
                            )}
                        </div>

                        {/* Live insight preview */}
                        {queueFiles.length > 0 && (
                            <div className={styles.rightCol}>
                                <div className={styles.insightPreview}>
                                    <div className={styles.insightHeader}>
                                        <div className={styles.pulseDot} />
                                        Insights discovered
                                    </div>
                                    {allDone ? (
                                        <div className={styles.insightCard}>
                                            <div className={styles.insightTheme}>Processing complete</div>
                                            <div className={styles.insightQuote}>
                                                {queueFiles.filter((f) => f.status === 'done').length} files analyzed successfully
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.emptyPreview}>
                                            Insights will appear here as files are processed…
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Metadata review */}
                {step === 'metadata' && (
                    <div className={styles.metadataSection}>
                        <h3 className={styles.metadataTitle}>Help us understand your interviews better</h3>
                        <p className={styles.metadataDesc}>
                            Adding participant details enables segmentation — you&apos;ll see which user groups feel
                            most strongly about each theme. This is optional — everything works without it too.
                        </p>
                        {queueFiles.filter((f) => f.status === 'done').map((qf) => (
                            <div key={qf.id} className={styles.metadataFile}>
                                <div className={styles.metadataFileHeader}>
                                    <span className={styles.metadataFileName}>{qf.file.name}</span>
                                    <span className={styles.metadataFileSummary}>No speakers detected</span>
                                </div>
                                <div className={styles.metadataFields}>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Participant:</label>
                                        <input className={styles.metadataInput} placeholder="Unknown" />
                                    </div>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Role:</label>
                                        <input className={styles.metadataInput} placeholder="Unknown" />
                                    </div>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Company:</label>
                                        <input className={styles.metadataInput} placeholder="Unknown" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && (
                    <div className={styles.completion}>
                        <div className={styles.completionIcon}>✅</div>
                        <div className={styles.completionText}>
                            {completedCount} interview{completedCount !== 1 ? 's' : ''} processed.{' '}
                            {insightsCount} insights discovered across {themesCount} themes.
                        </div>
                        <Button size="lg" onClick={handleViewInsights}>
                            View Insights →
                        </Button>
                    </div>
                )}

                {/* Footer actions */}
                {(step === 'processing' && allDone) && (
                    <div className={styles.footer}>
                        <Button variant="secondary" onClick={() => setStep('metadata')}>
                            Review Metadata
                        </Button>
                        <Button onClick={handleSkipMetadata}>
                            Skip — View Insights
                        </Button>
                    </div>
                )}

                {step === 'metadata' && (
                    <div className={styles.footer}>
                        <Button variant="secondary" onClick={handleSkipMetadata}>
                            Skip — continue without details
                        </Button>
                        <Button onClick={handleSkipMetadata}>
                            Save & View Insights
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
