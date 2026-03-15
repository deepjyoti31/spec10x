'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-slate-100 font-['Inter'] antialiased selection:bg-[#5E6AD2]/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="w-full px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-8">
              <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Spec10x</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined !text-sm">arrow_back</span>
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="relative pt-32 pb-32 max-w-4xl mx-auto px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#5E6AD2]/5 blur-[120px] -z-10 rounded-full"></div>
        
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#5E6AD2] mb-6">
            Legal Agreement
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.8] primary-gradient-text">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-lg">
            Last Updated: <span className="text-white">March 15, 2026</span>
          </p>
        </header>

        <div className="prose prose-invert prose-slate max-w-none space-y-16">
          <section className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              1. Agreement to Terms
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and <strong>VertiTech Inc</strong> (“Company”, “we”, “us”, or “our”), concerning your access to and use of the Spec10x platform.
              </p>
              <p>
                By accessing the Platform, you acknowledge that you have read, understood, and agree to be bound by all of these Terms. If you do not agree with all of these terms, then you are expressly prohibited from using the Platform and you must discontinue use immediately.
              </p>
            </div>
          </section>

          <section className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
                2. Intellectual Property Rights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">Our Content</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Unless otherwise indicated, the Platform is our proprietary property and all source code, databases, functionality, software, website designs, and graphics are owned or controlled by us.
                  </p>
                </div>
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">Your Content</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    You retain all rights and ownership of the data, transcripts, and documents you upload to Spec10x. By uploading, you grant us a limited license to process this content solely for providing the Service.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass p-8 rounded-3xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              3. AI-Generated Insights
            </h2>
            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                Spec10x utilizes advanced artificial intelligence to generate summaries, PRDs, and theme clusters.
              </p>
              <div className="p-6 rounded-2xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/20">
                <h4 className="text-[#5E6AD2] font-bold mb-2">Accuracy Disclaimer</h4>
                <p className="text-sm italic">
                  AI-generated content may occasionally contain inaccuracies or hallucinations. We strongly recommend that product managers and engineers review all AI-generated technical requirements before implementation.
                </p>
              </div>
              <p>
                You are responsible for any decisions made based on AI-generated insights. Spec10x does not guarantee the fitness of generated PRDs for any specific technical implementation or business objective.
              </p>
            </div>
          </section>

          <section className="space-y-6 text-slate-400 leading-relaxed">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              4. Prohibited Activities
            </h2>
            <p>You may not use the Platform for any purpose other than that for which we make the Platform available. Prohibited activities include:</p>
            <ul className="list-disc pl-6 space-y-3">
              <li>Systematically retrieving data to create a database or directory without written permission.</li>
              <li>Attempting to bypass security measures or reverse-engineer our AI processing pipeline.</li>
              <li>Uploading content that is illegal, defamatory, or violates third-party intellectual property rights.</li>
              <li>Using automated systems (bots, scrapers) to access the service beyond provided API integrations.</li>
            </ul>
          </section>

          <section className="space-y-6 text-slate-400 leading-relaxed">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              5. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, in no event shall <strong>VertiTech Inc</strong>, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or technical downtime.
            </p>
            <p>
              The platform is provided on an "as-is" and "as-available" basis. You agree that your use of the platform and our services will be at your sole risk.
            </p>
          </section>

          <section className="space-y-6 text-slate-400 leading-relaxed">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              6. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and defined following the laws of <strong>Delaware, United States</strong>. VertiTech Inc and yourself irrevocably consent that the courts of Delaware shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
            </p>
          </section>

          <section className="glass p-12 rounded-[40px] border border-white/5 text-center">
            <h2 className="text-3xl font-black text-white mb-6">Questions?</h2>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              If you have any questions regarding these Terms of Service, please contact our support team.
            </p>
            <div className="space-y-4">
              <a href="mailto:hello@spec10x.com" className="text-2xl font-bold text-[#5E6AD2] hover:text-[#5E6AD2]/80 transition-colors block">
                hello@spec10x.com
              </a>
              <div className="text-sm text-slate-500">
                <p className="font-bold text-slate-300">VertiTech Inc</p>
                <p>Newark, Delaware</p>
                <p>United States of America</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12 opacity-50">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500">
          <p>© 2026 Spec10x by VertiTech Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

