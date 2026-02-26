'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    width?: number;
    preventClose?: boolean;
    children: React.ReactNode;
}

export default function Modal({
    isOpen,
    onClose,
    width = 720,
    preventClose = false,
    children,
}: ModalProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !preventClose) {
                onClose();
            }
        },
        [onClose, preventClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !preventClose) {
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} style={{ width }}>
                <button
                    className={styles.closeButton}
                    onClick={() => !preventClose && onClose()}
                    aria-label="Close modal"
                >
                    ✕
                </button>
                <div className={styles.content}>{children}</div>
            </div>
        </div>
    );
}
