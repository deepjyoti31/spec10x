'use client';

import React from 'react';
import Link from 'next/link';

interface LegalPageShellProps {
    eyebrow: string;
    title: string;
    updatedAt: string;
    summary: string;
    children: React.ReactNode;
}

export default function LegalPageShell({
    eyebrow,
    title,
    updatedAt,
    summary,
    children,
}: LegalPageShellProps) {
    return (
        <div className="min-h-screen bg-[#080808] text-slate-100 font-['Inter'] antialiased selection:bg-[#5E6AD2]/30 overflow-x-hidden">
            <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
                <div className="w-full px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="size-8">
                            <img
                                src="/assets/logos/spec10x_logo_transparent_1080.png"
                                alt="Spec10x Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">
                            Spec10x
                        </span>
                    </Link>
                    <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
                        <Link className="hover:text-white transition-colors" href="/trust">
                            Trust
                        </Link>
                        <Link className="hover:text-white transition-colors" href="/">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative pt-32 pb-32 max-w-5xl mx-auto px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[520px] bg-[#5E6AD2]/5 blur-[140px] -z-10 rounded-full" />

                <header className="mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#5E6AD2] mb-6">
                        {eyebrow}
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.82] primary-gradient-text">
                        {title}
                    </h1>
                    <p className="text-slate-400 text-lg max-w-3xl leading-relaxed">
                        {summary}
                    </p>
                    <p className="text-slate-500 text-sm mt-4">
                        Last Updated: <span className="text-white">{updatedAt}</span>
                    </p>
                </header>

                <div className="space-y-8">{children}</div>
            </main>

            <footer className="border-t border-white/5 py-12 opacity-70">
                <div className="max-w-5xl mx-auto px-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm text-slate-500">
                    <p>Copyright 2026 Spec10x by VertiTech Inc. All rights reserved.</p>
                    <div className="flex items-center gap-5">
                        <Link className="hover:text-white transition-colors" href="/trust">
                            Trust
                        </Link>
                        <Link className="hover:text-white transition-colors" href="/privacy">
                            Privacy
                        </Link>
                        <Link className="hover:text-white transition-colors" href="/terms">
                            Terms
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
