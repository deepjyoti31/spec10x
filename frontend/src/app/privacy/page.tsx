'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
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
            Privacy Framework
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-[0.8] primary-gradient-text">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-lg">
            Last Updated: <span className="text-white">March 15, 2026</span>
          </p>
        </header>

        <div className="prose prose-invert prose-slate max-w-none space-y-16">
          <section className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              1. Introduction
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                Welcome to Spec10x. This Privacy Policy describes how <strong>VertiTech Inc</strong> ("the Company", "we", "us", or "our"), a company registered in Newark, Delaware, USA, collects, uses, and discloses your information when you use our platform.
              </p>
              <p>
                We provide an intelligence layer for product discovery, and protecting the sensitive customer data you entrust to us is our highest priority. By using Spec10x, you agree to the collection and use of information in accordance with this policy.
              </p>
            </div>
          </section>

          <section className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
                2. Information We Collect
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">Personal Data</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you, including your name, email address, and billing information.
                  </p>
                </div>
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">User Content</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We collect the files you upload (audio, video, transcripts) and the metadata associated with them. This content is processed solely to provide insights for your organization.
                  </p>
                </div>
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">Usage Data</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    This includes your device's IP address, browser type, pages visited, and time spent on the platform to help us optimize the performance and security of our services.
                  </p>
                </div>
                <div className="glass-dark p-6 rounded-2xl border border-white/5">
                  <h3 className="text-white font-bold mb-3">Cookies</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    We use administrative cookies and similar tracking technologies to handle sessions and maintain your authenticated state across the platform.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass p-8 rounded-3xl border border-white/5">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              3. Data Processing and AI
            </h2>
            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                Our core service involves the use of artificial intelligence to analyze, cluster, and synthesize customer feedback. Your data is processed using secure, enterprise-grade inference models.
              </p>
              <div className="p-6 rounded-2xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/20">
                <h4 className="text-[#5E6AD2] font-bold mb-2">Zero Training Guarantee</h4>
                <p className="text-sm italic">
                  We do NOT use your proprietary interview data, transcripts, or strategic documents to train base foundation models. Your data remains isolated to your organization's environment.
                </p>
              </div>
              <p>
                We only use sub-processors that meet strict security and confidentiality standards. These partners are prohibited from using your data for any other purpose than providing specific infra services to us.
              </p>
            </div>
          </section>

          <section className="space-y-6 text-slate-400 leading-relaxed">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              4. Data Infrastructure & Security
            </h2>
            <div className="space-y-4">
              <p>
                The security and integrity of your product discovery data are foundational to our platform. We utilize <strong>Google Cloud Platform (GCP)</strong> to host our infrastructure, benefiting from world-class physical and network security.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5E6AD2] text-sm">lock</span>
                    Encryption
                  </h4>
                  <p className="text-xs leading-relaxed">
                    All data is encrypted using industry-standard protocols. We employ AES-256 encryption for data at rest and TLS 1.2+ for all data in transit. 
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5E6AD2] text-sm">cloud_done</span>
                    Resiliency
                  </h4>
                  <p className="text-xs leading-relaxed">
                    Data is stored in high-availability, multi-region configurations within GCP to ensure durability and continuous access even in the event of regional failures.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5E6AD2] text-sm">admin_panel_settings</span>
                    Access Control
                  </h4>
                  <p className="text-xs leading-relaxed">
                    We implement the principle of least privilege. Access to production environments is strictly gated via multi-factor authentication and role-based access controls (RBAC).
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5E6AD2] text-sm">monitoring</span>
                    Audit Logs
                  </h4>
                  <p className="text-xs leading-relaxed">
                    All administrative access and critical system activities are logged and monitored to detect and respond to potential security incidents in real-time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 text-slate-400 leading-relaxed">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#5E6AD2]"></span>
              5. Your Rights and Ownership
            </h2>
            <p>
              You maintain full ownership of all content uploaded to the platform. You have the right to access, update, export, or delete your data at any time through the platform settings or by contacting our support team.
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Deletion:</strong> You can purge your entire workspace and all associated transcripts instantly.</li>
              <li><strong>Portability:</strong> You can export your insights and summaries at any time.</li>
              <li><strong>Opt-out:</strong> You can unsubscribe from marketing communications while retaining service-essential emails.</li>
            </ul>
          </section>

          <section className="glass p-12 rounded-[40px] border border-white/5 text-center">
            <h2 className="text-3xl font-black text-white mb-6">Contact Us</h2>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              If you have any questions about this Privacy Policy or our data practices, please reach out to our legal team.
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

