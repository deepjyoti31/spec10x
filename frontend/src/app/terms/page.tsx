'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
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
        
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white mb-4">Terms of Service</h1>
        <p className="text-slate-400 mb-12">Last Updated: March 10, 2026</p>

        <div className="space-y-12 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By using Spec10x, you agree to these terms. If you are using the service on behalf of a company, you represent that you have the authority to bind that entity to these terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
            <p>Spec10x provides an AI-powered intelligence layer for product discovery, including transcription, insight extraction, and theme clustering.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Prohibited Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uploading illegal or infringing content.</li>
              <li>Attempting to reverse engineer the AI processing engine.</li>
              <li>Using the service to create competing automated PRD generation tools.</li>
              <li>Exceeding plan-based usage limits in an automated fashion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Subscription & Billing</h2>
            <p>While we are currently in beta/v0.1, usage is free within standard tier limits. We reserve the right to introduce paid plans (Pro/Business) and modify feature availability based on service cost.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer of Warranties</h2>
            <p>The service is provided "as is." While our AI models (Gemini 3 Flash) are highly accurate, Spec10x does not guarantee 100% accuracy in transcription or insight extraction. Users should verify critical technical requirements.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Limitation of Liability</h2>
            <p>Spec10x shall not be liable for any indirect, incidental, or consequential damages resulting from the use of the service or reliance on AI-generated insights.</p>
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
