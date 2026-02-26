'use client';

import React from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'new' | 'pain_point' | 'feature_request' | 'positive' | 'suggestion' | 'count';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

export default function Badge({
    variant = 'default',
    children,
    className,
}: BadgeProps) {
    return (
        <span className={`${styles.badge} ${styles[variant]} ${className || ''}`}>
            {children}
        </span>
    );
}
