'use client';

import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    selected?: boolean;
    children: React.ReactNode;
}

export default function Card({
    interactive = false,
    selected = false,
    children,
    className,
    ...props
}: CardProps) {
    return (
        <div
            className={`${styles.card} ${interactive ? styles.interactive : ''} ${selected ? styles.selected : ''} ${className || ''}`}
            {...props}
        >
            {children}
        </div>
    );
}
