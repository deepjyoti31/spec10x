'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-slate-100 font-['Inter'] antialiased selection:bg-[#5E6AD2]/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="size-8">
              <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Spec10x</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#features">Features</a>
            <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#how-it-works">Process</a>
            <a className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-6">
            <Link className="text-sm font-medium text-slate-400 hover:text-white transition-colors" href="/login">Sign In</Link>
            <Link href="/signup">
              <button className="h-9 px-5 rounded-lg bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(94,106,210,0.3)]">
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative grid-lines">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute inset-0 hero-gradient -z-10"></div>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 text-[#5E6AD2] text-xs font-semibold uppercase tracking-widest mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2] animate-pulse"></span>
              Cursor for Product Managers
            </div>
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-8">
              Know What to Build.<br />
              <span className="primary-gradient-text">Before You Build It.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Capture every nuance of user discovery. Spec10x transforms messy transcripts into technical specs that engineering teams actually want to build.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="w-full h-14 px-10 rounded-xl bg-gradient-to-r from-[#5E6AD2] to-[#00C2FF] text-white font-bold text-lg transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(94,106,210,0.4)]">
                  Join For Free
                </button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <button className="w-full h-14 px-10 rounded-xl glass hover:bg-white/5 text-white font-semibold flex items-center justify-center gap-2 transition-all">
                  <span className="material-symbols-outlined">play_circle</span>
                  How it Works
                </button>
              </a>
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-7xl mx-auto px-6 mt-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl glass border-white/5 text-center group transition-all hover:border-[#5E6AD2]/30">
                <div className="text-5xl font-black text-white mb-3 text-glow">10x</div>
                <div className="text-slate-400 font-semibold tracking-tight uppercase text-sm">Faster spec writing</div>
              </div>
              <div className="p-8 rounded-2xl glass border-white/5 text-center group transition-all hover:border-[#00C2FF]/30">
                <div className="text-5xl font-black text-white mb-3 text-glow">90%</div>
                <div className="text-slate-400 font-semibold tracking-tight uppercase text-sm">Intent capture accuracy</div>
              </div>
              <div className="p-8 rounded-2xl glass border-white/5 text-center group transition-all hover:border-[#5E6AD2]/30">
                <div className="text-5xl font-black text-white mb-3 text-glow">3 hrs</div>
                <div className="text-slate-400 font-semibold tracking-tight uppercase text-sm">Discovery-to-spec <span className="text-slate-500">(vs. 3 days)</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features & Process Section */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Discovery is broken. We fixed it.</h2>
            <p className="text-slate-400">Stop losing context between Zoom calls and Jira tickets.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-xl glass border-white/5 space-y-4">
              <span className="material-symbols-outlined text-[#5E6AD2]">summarize</span>
              <h3 className="font-bold text-lg">Manual Synthesis</h3>
              <p className="text-sm text-slate-400">Hours wasted re-reading notes and hunting for feature requests in Slack.</p>
            </div>
            <div className="p-8 rounded-xl glass border-white/5 space-y-4">
              <span className="material-symbols-outlined text-[#00C2FF]">heart_broken</span>
              <h3 className="font-bold text-lg">Misalignment</h3>
              <p className="text-sm text-slate-400">Engineering builds what you wrote, not what the customer actually meant.</p>
            </div>
            <div className="p-8 rounded-xl glass border-white/5 space-y-4">
              <span className="material-symbols-outlined text-[#5E6AD2]">timer</span>
              <h3 className="font-bold text-lg">Discovery Debt</h3>
              <p className="text-sm text-slate-400">Valuable insights trapped in Gong recordings that no one ever watches.</p>
            </div>
          </div>
        </section>

        <section className="py-24 relative overflow-hidden" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">From Voice to Velocity</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">The automated pipeline that turns customer empathy into shipping code.</p>
            </div>
            <div className="space-y-32">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="w-full lg:w-1/2 space-y-6">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#5E6AD2]/20 border border-[#5E6AD2]/40 text-[#5E6AD2] font-bold">1</div>
                  <h3 className="text-3xl font-bold text-white">AI-Powered Synthesis</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">Our AI highlights core pain points from raw interview transcripts in real-time. No more manual tagging or missing key details.</p>
                </div>
                <div className="w-full lg:w-1/2">
                  <div className="glass rounded-2xl overflow-hidden border-[#5E6AD2]/20 shadow-2xl">
                    <div className="h-8 bg-white/5 flex items-center px-4 gap-2">
                      <div className="size-2 rounded-full bg-red-500/50"></div>
                      <div className="size-2 rounded-full bg-yellow-500/50"></div>
                      <div className="size-2 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="p-6 bg-slate-900/40">
                      <div className="space-y-3">
                        <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                        <div className="p-2 bg-[#5E6AD2]/10 border-l-2 border-[#5E6AD2] rounded-r">
                          <div className="h-4 w-full bg-[#5E6AD2]/20 rounded mb-2"></div>
                          <div className="h-4 w-2/3 bg-[#5E6AD2]/20 rounded"></div>
                        </div>
                        <div className="h-4 w-full bg-slate-800 rounded"></div>
                        <div className="h-4 w-1/2 bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                <div className="w-full lg:w-1/2 space-y-6">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C2FF]/20 border border-[#00C2FF]/40 text-[#00C2FF] font-bold">2</div>
                  <h3 className="text-3xl font-bold text-white">Auto-Draft PRDs</h3>
                  <p className="text-slate-400 text-lg leading-relaxed">Turn high-level intent into structured technical specs. Spec10x maps user stories to functional requirements automatically.</p>
                </div>
                <div className="w-full lg:w-1/2">
                  <div className="glass rounded-2xl overflow-hidden border-[#00C2FF]/20 shadow-2xl">
                    <div className="p-8 bg-slate-900/60">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="size-12 rounded-lg bg-[#00C2FF]/10 flex items-center justify-center border border-[#00C2FF]/30">
                          <span className="material-symbols-outlined text-[#00C2FF]">description</span>
                        </div>
                        <div>
                          <div className="h-4 w-40 bg-white/10 rounded mb-2"></div>
                          <div className="h-3 w-20 bg-white/5 rounded"></div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="h-3 w-full bg-white/5 rounded"></div>
                        <div className="h-3 w-full bg-white/5 rounded"></div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="h-20 rounded-lg border border-white/5 bg-white/5"></div>
                          <div className="h-20 rounded-lg border border-white/5 bg-white/5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stages Grid */}
        <section className="py-24 max-w-7xl mx-auto px-6" id="features">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">Everything You Need to Ship What Matters</h2>
          </div>
          <div className="grid grid-cols-12 gap-6 h-full lg:h-[700px]">
            <div className="col-span-12 lg:col-span-8 glass rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-4 max-w-md">
                <div className="text-[#5E6AD2] font-bold text-sm tracking-widest uppercase">Stage 01</div>
                <h3 className="text-2xl font-bold text-white">Discover</h3>
                <p className="text-slate-400">Record and transcribe every customer interaction with enterprise-grade security and context awareness.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-3/4 h-2/3 bg-slate-900/80 rounded-tl-2xl border-t border-l border-white/10 p-4 transition-transform group-hover:translate-x-2 group-hover:-translate-y-2">
                <div className="flex gap-2 mb-4">
                  <div className="size-8 rounded-full bg-blue-500/20 border border-blue-500/30"></div>
                  <div className="h-4 w-1/2 bg-white/10 rounded mt-2"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded"></div>
                  <div className="h-3 w-5/6 bg-white/5 rounded"></div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="text-[#00C2FF] font-bold text-sm tracking-widest uppercase">Stage 02</div>
                <h3 className="text-2xl font-bold text-white">Synthesize</h3>
                <p className="text-slate-400 text-sm">Cluster themes across 100s of interviews instantly.</p>
              </div>
              <div className="mt-8 flex flex-col gap-2">
                <div className="h-12 w-full rounded-lg bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex items-center px-4">
                  <span className="text-xs text-[#00C2FF] font-medium">Performance Issues (12)</span>
                </div>
                <div className="h-12 w-full rounded-lg bg-white/5 border border-white/5 flex items-center px-4">
                  <span className="text-xs text-slate-400 font-medium">UI Cleanup (8)</span>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="text-[#5E6AD2] font-bold text-sm tracking-widest uppercase">Stage 03</div>
                <h3 className="text-2xl font-bold text-white">Specify</h3>
                <p className="text-slate-400 text-sm">LLM-native PRD editor with live reference links.</p>
              </div>
              <div className="mt-6 border border-white/10 rounded-xl p-4 bg-black/20">
                <div className="h-4 w-full bg-[#5E6AD2]/20 rounded mb-4"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-2 w-full bg-white/5 rounded"></div>
                  <div className="h-2 w-full bg-white/5 rounded"></div>
                  <div className="h-2 w-full bg-white/5 rounded"></div>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="text-[#00C2FF] font-bold text-sm tracking-widest uppercase">Stage 04</div>
                <h3 className="text-2xl font-bold text-white">Deliver</h3>
                <p className="text-slate-400 text-sm">Direct integration with Engineering tickets.</p>
              </div>
              <div className="absolute bottom-4 left-8 right-8 flex justify-center gap-4">
                <div className="size-10 glass rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">link</span></div>
                <div className="size-10 glass rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">share</span></div>
                <div className="size-10 glass rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-sm">sync</span></div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="text-[#5E6AD2] font-bold text-sm tracking-widest uppercase">Stage 05</div>
                <h3 className="text-2xl font-bold text-white">Learn</h3>
                <p className="text-slate-400 text-sm">Close the loop by tracking spec-to-ship impact.</p>
              </div>
              <div className="mt-8">
                <div className="w-full h-24 bg-gradient-to-t from-[#5E6AD2]/20 to-transparent rounded-t-xl border-t border-x border-white/5"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#5E6AD2]/5 to-transparent"></div>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 leading-tight">Ready to build the right thing?</h2>
            <p className="text-xl text-slate-400 mb-12">Join 500+ product teams who use Spec10x to bridge the gap between discovery and delivery.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <button className="w-full h-14 px-12 rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white font-bold text-lg transition-all shadow-[0_0_30px_rgba(94,106,210,0.4)]">
                  Sign up Now
                </button>
              </Link>
              <button className="w-full sm:w-auto h-14 px-12 rounded-xl glass hover:bg-white/5 text-white font-semibold flex items-center justify-center gap-2">
                Talk to Sales
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-16 glass">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="size-7">
                    <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-lg font-bold text-white">Spec10x</span>
                </div>
                <p className="text-slate-400 max-w-xs text-sm">The world's first intelligence layer for product discovery and engineering alignment.</p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Platform</h4>
                <ul className="space-y-4 text-sm text-slate-400">
                  <li><a className="hover:text-white transition-colors" href="#">Features</a></li>
                  <li><a className="hover:text-white transition-colors" href="#">Integrations</a></li>
                  <li><a className="hover:text-white transition-colors" href="#">Enterprise</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Company</h4>
                <ul className="space-y-4 text-sm text-slate-400">
                  <li><a className="hover:text-white transition-colors" href="#">About</a></li>
                  <li><a className="hover:text-white transition-colors" href="#">Careers</a></li>
                  <li><a className="hover:text-white transition-colors" href="#">Privacy</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
              <p>© 2026 Spec10x. All rights reserved.</p>
              <div className="flex gap-6">
                <a className="hover:text-white" href="#">Twitter</a>
                <a className="hover:text-white" href="#">LinkedIn</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
