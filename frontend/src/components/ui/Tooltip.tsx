'use client';

import React from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
    return (
        <span className={styles.tooltipWrapper}>
            {children}
            <span className={styles.tooltip}>{content}</span>
        </span>
    );
}
