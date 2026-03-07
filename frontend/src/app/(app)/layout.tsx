/**
 * Spec10x — App Route Group Layout
 *
 * Wraps all protected (app) pages with the AppLayout
 * which provides the NavBar and auth protection.
 */

'use client';

import AppLayout from '@/components/layout/AppLayout';
import '@/styles/design-tokens.css';

export default function AppGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dashboard-theme" style={{ minHeight: '100vh' }}>
            <AppLayout>{children}</AppLayout>
        </div>
    );
}
