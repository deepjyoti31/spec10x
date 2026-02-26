'use client';

import React, { useRef, useState, useCallback } from 'react';
import styles from './DropZone.module.css';

const ACCEPTED_TYPES = [
    '.txt', '.md', '.pdf', '.docx', '.mp3', '.wav', '.mp4',
];

const ACCEPTED_MIMES = [
    'text/plain', 'text/markdown', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/wav', 'video/mp4',
];

interface DropZoneProps {
    onFilesSelected: (files: File[]) => void;
    compact?: boolean;
}

export default function DropZone({ onFilesSelected, compact = false }: DropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) =>
            ACCEPTED_MIMES.some((mime) => f.type === mime) ||
            ACCEPTED_TYPES.some((ext) => f.name.toLowerCase().endsWith(ext))
        );
        if (files.length > 0) onFilesSelected(files);
    }, [onFilesSelected]);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) onFilesSelected(files);
        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    if (compact) {
        return (
            <div
                className={`${styles.dropZone} ${styles.dropZoneCompact} ${isDragOver ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <span className={styles.uploadIcon}>📁</span>
                <span className={styles.primaryText}>Add more files…</span>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES.join(',')}
                    className={styles.hiddenInput}
                    onChange={handleInputChange}
                />
            </div>
        );
    }

    return (
        <div
            className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <div className={styles.uploadIcon}>☁️</div>
            <div className={styles.primaryText}>Drag & drop interview files here</div>
            <div className={styles.secondaryText}>or click to browse</div>
            <div className={styles.formats}>
                {ACCEPTED_TYPES.map((fmt) => (
                    <span key={fmt} className={styles.formatPill}>{fmt}</span>
                ))}
            </div>
            <div className={styles.batchNote}>Upload up to 50 files at once</div>
            <div className={styles.transcriptHint}>
                💡 Already have transcripts from Otter, Fireflies, or another tool? Upload those for faster processing!
            </div>
            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(',')}
                className={styles.hiddenInput}
                onChange={handleInputChange}
            />
        </div>
    );
}
