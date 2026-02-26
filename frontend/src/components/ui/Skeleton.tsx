'use client';

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    variant?: 'text' | 'card' | 'avatar' | 'custom';
    width?: string | number;
    height?: string | number;
    className?: string;
}

export default function Skeleton({
    variant = 'text',
    width,
    height,
    className,
}: SkeletonProps) {
    const variantClass = variant !== 'custom' ? styles[variant === 'card' ? 'cardSkel' : variant] : '';

    return (
        <div
            className={`${styles.skeleton} ${variantClass} ${className || ''}`}
            style={{ width, height }}
        />
    );
}
