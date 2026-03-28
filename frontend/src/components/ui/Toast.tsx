'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
    success: 'border-[var(--color-success)] text-[var(--color-success)]',
    error:   'border-[var(--color-danger)] text-[var(--color-danger)]',
    warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
    info:    'border-[var(--color-accent)] text-[var(--color-accent)]',
};

const ICONS: Record<ToastVariant, string> = {
    success: 'check_circle',
    error:   'error',
    warning: 'warning',
    info:    'info',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
                aria-live="polite"
            >
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border bg-[var(--color-bg-card)] shadow-lg text-sm font-medium animate-[fadeIn_200ms_ease-out] min-w-[280px] max-w-[400px] ${VARIANT_STYLES[toast.variant]}`}
                        style={{ borderColor: 'inherit' }}
                    >
                        <span className="material-symbols-outlined text-base">{ICONS[toast.variant]}</span>
                        <span className="flex-1 text-[var(--color-text-primary)]">{toast.message}</span>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            aria-label="Dismiss"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
