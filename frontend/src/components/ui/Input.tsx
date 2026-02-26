'use client';

import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    suffix?: React.ReactNode;
    variant?: 'default' | 'search';
}

export default function Input({
    icon,
    suffix,
    variant = 'default',
    className,
    ...props
}: InputProps) {
    return (
        <div className={styles.inputWrapper}>
            {icon && <span className={styles.icon}>{icon}</span>}
            <input
                className={`${styles.input} ${icon ? styles.hasIcon : ''} ${suffix ? styles.hasSuffix : ''} ${variant === 'search' ? styles.search : ''} ${className || ''}`}
                {...props}
            />
            {suffix && <span className={styles.suffix}>{suffix}</span>}
        </div>
    );
}
