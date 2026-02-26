/**
 * Spec10x — App Route Group Layout
 *
 * Wraps all protected (app) pages with the AppLayout
 * which provides the NavBar and auth protection.
 */

'use client';

import AppLayout from '@/components/layout/AppLayout';

export default function AppGroupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}
