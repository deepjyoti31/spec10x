'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmail, loginWithGoogle } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.push('/home');
        }
    }, [user, authLoading, router]);

    // Don't render the form while auth is initializing or if we're redirecting
    if (authLoading || user) {
        return null;
    }

    async function handleEmailLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginWithEmail(email, password);
            router.push('/home');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            router.push('/home');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Google sign in failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-[400px]">

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
                <img
                    src="/assets/logos/spec10x_logo_transparent_1080.png"
                    alt="Spec10x"
                    className="w-7 h-7 object-contain"
                />
                <span className="text-[18px] font-bold text-[#F0F0F3]">Spec10x</span>
            </div>

            {/* Card */}
            <div className="bg-[#161820] border border-[#1E2028] rounded-xl p-8">
                <h1 className="text-[22px] font-bold text-[#F0F0F3] mb-1">Welcome back</h1>
                <p className="text-[14px] text-[#8B8D97] mb-6">Sign in to your workspace</p>

                {/* Google */}
                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 h-10 bg-[#1C1E28] border border-[#2A2C38] rounded-lg text-[14px] font-medium text-[#F0F0F3] hover:bg-[#22242E] hover:border-[#3A3C48] transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
                >
                    {/* Google SVG icon */}
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-[1px] bg-[#1E2028]" />
                    <span className="text-[12px] text-[#5A5C66]">or</span>
                    <div className="flex-1 h-[1px] bg-[#1E2028]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label className="block text-[13px] font-medium text-[#B0B2BA] mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            className="w-full h-10 px-3 bg-[#1C1E28] border border-[#2A2C38] rounded-lg text-[14px] text-[#F0F0F3] placeholder:text-[#5A5C66] focus:outline-none focus:border-[#afc6ff] focus:ring-1 focus:ring-[#afc6ff]/30 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-medium text-[#B0B2BA] mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full h-10 px-3 bg-[#1C1E28] border border-[#2A2C38] rounded-lg text-[14px] text-[#F0F0F3] placeholder:text-[#5A5C66] focus:outline-none focus:border-[#afc6ff] focus:ring-1 focus:ring-[#afc6ff]/30 transition-all"
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 rounded-lg">
                            <span className="material-symbols-outlined text-[#ffb4ab] flex-shrink-0" style={{ fontSize: 16 }}>error</span>
                            <p className="text-[13px] text-[#ffb4ab] leading-snug">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-10 bg-[var(--color-brand)] hover:brightness-110 text-white text-[14px] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>

            {/* Sign up link */}
            <p className="text-center text-[13px] text-[#8B8D97] mt-5">
                Don&apos;t have an account?{' '}
                <a href="/signup" className="text-[#afc6ff] hover:text-[#6B9FFF] font-medium transition-colors">
                    Sign up
                </a>
            </p>
        </div>
    );
}
