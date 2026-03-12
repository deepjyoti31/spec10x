'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-slate-100 font-['Inter'] antialiased selection:bg-[#5E6AD2]/30 overflow-x-hidden">
      {/* Simple Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8">
              <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Spec10x</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="relative pt-32 pb-20 max-w-4xl mx-auto px-6">
        <div className="absolute inset-0 hero-gradient -z-10 opacity-30"></div>
        
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-4">Privacy Policy</h1>
        <p className="text-slate-400 mb-12">Last Updated: March 10, 2026</p>

        <div className="space-y-12 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <p>Spec10x ("we," "our," or "us") is committed to protecting your privacy. We collect information to provide a 10x better discovery experience for product teams.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address and name provided via Google or Email authentication.</li>
                <li><strong>User Content:</strong> Interview transcripts, audio files, and video files you upload.</li>
                <li><strong>Usage Data:</strong> Metadata about your usage (upload counts, query volumes) to manage quotas and billing.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Data</h2>
            <p>Your data is used to extract insights, cluster themes, and answer your questions via our AI engine. We use Vertex AI (Gemini) for processing.</p>
            <div className="mt-4 p-4 rounded-xl bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-sm">
              <p className="font-semibold text-[#5E6AD2] mb-1">Important Note on AI Training</p>
              We do <strong>NOT</strong> use your private interview data or proprietary content to train foundation AI models without your explicit, separate opt-in consent.
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security & Storage</h2>
            <p>All interview data is stored on encrypted Google Cloud Storage (GCS) buckets. Database records are stored in high-availability Cloud SQL instances with PII protection standards.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Your Rights</h2>
            <p>You maintain full ownership of your data. You can delete individual interviews, clear all your data, or delete your account entirely at any time from the Settings page. This action is immediate and permanent.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Contact</h2>
            <p>For privacy-related inquiries, reach out to <span className="text-white">privacy@spec10x.com</span>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 mt-20 opacity-50">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500">
          <p>© 2026 Spec10x. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
