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
    const [errorCount, setErrorCount] = useState(0);
    const [themesCount, setThemesCount] = useState(0);

    interface FileMetadata {
        speakerId: string | null;
        name: string;
        role: string;
        company: string;
        speakerCount: number;
    }
    const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);

    // Process WebSocket updates
    React.useEffect(() => {
        if (wsMessages.length === 0) return;
        const latest = wsMessages[wsMessages.length - 1];

        setQueueFiles((prev) =>
            prev.map((qf) => {
                // Match by interview ID if we have one stored
                if ((qf as QueueFile & { interviewId?: string }).interviewId === latest.interview_id) {
                    const wasDone = qf.status === 'done' || qf.status === 'error';
                    const nowDone = latest.status === 'done';
                    const nowError = latest.status === 'error';

                    // Track completion counts on transition
                    if (!wasDone && nowDone) {
                        setCompletedCount((c) => c + 1);
                    }
                    if (!wasDone && nowError) {
                        setErrorCount((c) => c + 1);
                    }

                    return {
                        ...qf,
                        status: nowDone ? 'done' : nowError ? 'error' : latest.status,
                        progress: nowDone || nowError ? 100 : latest.progress || qf.progress,
                        error: nowError ? latest.message : undefined,
                    } as QueueFile;
                }
                return qf;
            })
        );
    }, [wsMessages]);

    // Fetch speaker metadata when a file completes
    React.useEffect(() => {
        if (!token) return;
        let mounted = true;

        queueFiles.forEach(qf => {
            const extendedQf = qf as QueueFile & { interviewId?: string };
            if (extendedQf.status === 'done' && extendedQf.interviewId) {
                setFileMetadata(prev => {
                    if (prev[extendedQf.id]) return prev; // Already fetched or fetching

                    // Mark as fetching
                    const newMetadata = { ...prev, [extendedQf.id]: { speakerId: null, name: '', role: '', company: '', speakerCount: 0 } };

                    api.getInterview(token, extendedQf.interviewId!)
                        .then(interview => {
                            if (!mounted) return;
                            const primarySpeaker = interview.speakers.find(s => !s.is_interviewer) || interview.speakers[0];
                            setFileMetadata(current => ({
                                ...current,
                                [extendedQf.id]: {
                                    speakerId: primarySpeaker?.id || null,
                                    name: primarySpeaker?.name || '',
                                    role: primarySpeaker?.role || '',
                                    company: primarySpeaker?.company || '',
                                    speakerCount: interview.speakers.length,
                                }
                            }));
                        })
                        .catch(console.error);

                    return newMetadata;
                });
            }
        });

        return () => { mounted = false; };
    }, [queueFiles, token]);

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

                // Real updates come via WebSocket — no fake completion

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
    }, []);

    const handleMetadataChange = (fileId: string, field: keyof FileMetadata, value: string) => {
        setFileMetadata(prev => ({
            ...prev,
            [fileId]: { ...prev[fileId], [field]: value }
        }));
    };

    const handleSaveMetadata = async () => {
        if (!token) return;
        setIsSavingMetadata(true);

        try {
            const promises = queueFiles.map(qf => {
                const extendedQf = qf as QueueFile & { interviewId?: string };
                if (extendedQf.status === 'done' && extendedQf.interviewId && fileMetadata[extendedQf.id]?.speakerId) {
                    const meta = fileMetadata[extendedQf.id];
                    return api.updateSpeaker(token, extendedQf.interviewId, meta.speakerId!, {
                        name: meta.name || undefined,
                        role: meta.role || undefined,
                        company: meta.company || undefined,
                    });
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Failed to save metadata', error);
        } finally {
            setIsSavingMetadata(false);
            setStep('complete');
        }
    };

    const handleViewInsights = useCallback(() => {
        setStep('upload');
        setQueueFiles([]);
        setCompletedCount(0);
        setErrorCount(0);
        setFileMetadata({});
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
                setCompletedCount(0);
                setErrorCount(0);
                setFileMetadata({});
                onClose();
            }
        } else {
            setStep('upload');
            setQueueFiles([]);
            setCompletedCount(0);
            setErrorCount(0);
            setFileMetadata({});
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
                                    <span className={styles.metadataFileSummary}>
                                        {fileMetadata[qf.id]?.speakerCount > 0
                                            ? `${fileMetadata[qf.id].speakerCount} speaker${fileMetadata[qf.id].speakerCount !== 1 ? 's' : ''} detected`
                                            : 'No speakers detected'}
                                    </span>
                                </div>
                                <div className={styles.metadataFields}>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Participant:</label>
                                        <input
                                            className={styles.metadataInput}
                                            placeholder="Unknown"
                                            value={fileMetadata[qf.id]?.name || ''}
                                            onChange={(e) => handleMetadataChange(qf.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Role:</label>
                                        <input
                                            className={styles.metadataInput}
                                            placeholder="Unknown"
                                            value={fileMetadata[qf.id]?.role || ''}
                                            onChange={(e) => handleMetadataChange(qf.id, 'role', e.target.value)}
                                        />
                                    </div>
                                    <div className={styles.metadataFieldRow}>
                                        <label className={styles.metadataLabel}>Company:</label>
                                        <input
                                            className={styles.metadataInput}
                                            placeholder="Unknown"
                                            value={fileMetadata[qf.id]?.company || ''}
                                            onChange={(e) => handleMetadataChange(qf.id, 'company', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && (
                    <div className={styles.completion}>
                        <div className={styles.completionIcon}>{errorCount > 0 && completedCount === 0 ? '❌' : errorCount > 0 ? '⚠️' : '✅'}</div>
                        <div className={styles.completionText}>
                            {completedCount > 0 && (
                                <>{completedCount} interview{completedCount !== 1 ? 's' : ''} processed successfully.</>
                            )}
                            {errorCount > 0 && (
                                <span style={{ color: 'var(--color-error, #ef4444)' }}>
                                    {errorCount} interview{errorCount !== 1 ? 's' : ''} failed — click on the interview in the sidebar to see the error.
                                </span>
                            )}
                            {completedCount === 0 && errorCount === 0 && (
                                <>Processing complete.</>
                            )}
                        </div>
                        <Button size="lg" onClick={handleViewInsights}>
                            {errorCount > 0 && completedCount === 0 ? 'Close' : 'View Insights →'}
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
                        <Button variant="secondary" onClick={handleSkipMetadata} disabled={isSavingMetadata}>
                            Skip — continue without details
                        </Button>
                        <Button onClick={handleSaveMetadata} disabled={isSavingMetadata}>
                            {isSavingMetadata ? 'Saving...' : 'Save & View Insights'}
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
