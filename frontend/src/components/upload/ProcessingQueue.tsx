'use client';

import React from 'react';
import styles from './ProcessingQueue.module.css';

export interface QueueFile {
    id: string;
    file: File;
    status: 'queued' | 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error';
    progress: number;
    error?: string;
}

interface ProcessingQueueProps {
    files: QueueFile[];
    onRemove: (id: string) => void;
}

function getFileIcon(type: string): string {
    if (type.includes('audio')) return '🎤';
    if (type.includes('video')) return '🎬';
    if (type.includes('pdf')) return '📕';
    return '📄';
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, string> = {
    queued: '⏳ Queued',
    uploading: '⬆️ Uploading…',
    transcribing: '🔄 Transcribing…',
    analyzing: '🔄 Analyzing…',
    done: '✅ Done',
    error: '❌ Error',
};

const STATUS_CLASSES: Record<string, string> = {
    queued: styles.statusQueued,
    uploading: styles.statusAnalyzing,
    transcribing: styles.statusTranscribing,
    analyzing: styles.statusAnalyzing,
    done: styles.statusDone,
    error: styles.statusError,
};

export default function ProcessingQueue({ files, onRemove }: ProcessingQueueProps) {
    const doneCount = files.filter((f) => f.status === 'done').length;
    const totalCount = files.length;
    const overallProgress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    const allDone = doneCount === totalCount;

    return (
        <div>
            <div className={styles.queue}>
                {files.map((qf) => (
                    <div key={qf.id} className={styles.fileRow}>
                        <span className={styles.fileIcon}>
                            {getFileIcon(qf.file.type || qf.file.name)}
                        </span>
                        <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{qf.file.name}</div>
                            <div className={styles.fileMeta}>
                                {formatSize(qf.file.size)}
                                {qf.error && (
                                    <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>
                                        {qf.error}
                                    </span>
                                )}
                            </div>
                            {qf.status !== 'done' && qf.status !== 'error' && qf.status !== 'queued' && (
                                <div className={styles.progressTrack}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${qf.progress}%` }}
                                    />
                                </div>
                            )}
                            {qf.status === 'done' && (
                                <div className={styles.progressTrack}>
                                    <div className={`${styles.progressFill} ${styles.progressFillDone}`} style={{ width: '100%' }} />
                                </div>
                            )}
                            {qf.status === 'error' && (
                                <div className={styles.progressTrack}>
                                    <div className={`${styles.progressFill} ${styles.progressFillError}`} style={{ width: '100%' }} />
                                </div>
                            )}
                        </div>
                        <span className={`${styles.fileStatus} ${STATUS_CLASSES[qf.status] || ''}`}>
                            {STATUS_LABELS[qf.status] || qf.status}
                        </span>
                        <button
                            className={styles.removeBtn}
                            onClick={() => onRemove(qf.id)}
                            aria-label="Remove file"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Overall status */}
            <div className={styles.overallStatus}>
                <span>
                    {allDone
                        ? `All ${totalCount} files processed`
                        : `Processing: ${doneCount} of ${totalCount} files`}
                </span>
                <div className={styles.overallProgress}>
                    <div className={styles.overallFill} style={{ width: `${overallProgress}%` }} />
                </div>
            </div>
        </div>
    );
}
