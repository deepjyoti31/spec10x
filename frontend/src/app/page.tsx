'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState('phase-discover');

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll spy pipeline
  useEffect(() => {
    const phases = ['phase-discover', 'phase-synthesize', 'phase-specify', 'phase-deliver', 'phase-learn'];
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -50% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveStep(entry.target.id);
        }
      });
    }, observerOptions);

    phases.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      const navHeight = 64;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 40;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  };

  const PipelineStep = ({ id, icon, label, defaultColor, hoverClasses, activeClasses, boxShadow }: any) => {
    const isActive = activeStep === id;
    return (
      <div
        className={`group flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 pipeline-step ${isActive ? 'active-step' : ''}`}
        onClick={(e) => handleSmoothScroll(e, id)}
      >
        <div
          className={`w-12 h-12 rounded-lg bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color flex items-center justify-center transition-all step-icon ${isActive ? activeClasses : `text-slate-400 ${hoverClasses}`}`}
          style={isActive && boxShadow ? { boxShadow } : {}}
        >
          <span className="font-mono text-xl">{icon}</span>
        </div>
        <span className={`font-mono text-xs uppercase tracking-wider transition-colors step-label ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 font-display selection:bg-primary/30 selection:text-white overflow-x-hidden antialiased">
      {/* Navbar - Stitch style 'glass-nav' */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background-dark/80 backdrop-blur-xl border-b border-border-color shadow-lg' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 text-primary">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Spec10x</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features-section" onClick={(e) => handleSmoothScroll(e, 'features-section')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing-section" onClick={(e) => handleSmoothScroll(e, 'pricing-section')} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
            <a href="https://github.com/your-repo/spec10x" target="_blank" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hidden md:flex h-9 items-center justify-center px-4 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-sm font-semibold transition-all shadow-[0_0_15px_rgba(96,107,210,0.15)] hover:shadow-[0_0_20px_rgba(96,107,210,0.3)]">
              Join Waitlist
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex flex-col gap-1.5 p-2"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-slate-100 transition-all duration-200 ${isMobileMenuOpen ? 'rotate-45 translate-y-[8px]' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-100 transition-all duration-200 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-slate-100 transition-all duration-200 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-border-color bg-background-dark/95 backdrop-blur-md`}>
          <div className="flex flex-col px-6 py-4 gap-3 text-sm text-slate-400 font-medium">
            <a href="#features-section" onClick={(e) => { handleSmoothScroll(e, 'features-section'); setIsMobileMenuOpen(false); }} className="hover:text-primary transition-colors py-2">Features</a>
            <a href="#pricing-section" onClick={(e) => { handleSmoothScroll(e, 'pricing-section'); setIsMobileMenuOpen(false); }} className="hover:text-primary transition-colors py-2">Pricing</a>
            <a href="https://github.com/your-repo/spec10x" target="_blank" className="hover:text-primary transition-colors py-2">Docs</a>
            <button
              onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}
              className="mt-2 h-10 w-full bg-primary text-white text-sm font-semibold rounded hover:bg-primary-glow transition-all duration-200">
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      <main className="relative flex flex-col items-center w-full pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div className="absolute top-0 left-0 w-full h-[800px] grid-bg bg-grid-pattern opacity-10 pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-hero-glow -z-[5] h-[600px] pointer-events-none" />

        {/* Stitch Hero Section */}
        <section className="relative w-full max-w-7xl mx-auto px-6 text-center z-10">
          <div className="max-w-4xl mx-auto space-y-8 mt-12 mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Now in Private Beta
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[1.1]">
              Know What to Build.<br />
              <span className="text-transparent bg-clip-text bg-primary-gradient">Before You Build It.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              AI Interview Intelligence Platform that transforms user conversations into flawless technical specs for PMs and Engineering leaders.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto h-12 px-8 rounded-lg bg-primary hover:bg-primary-glow text-white font-bold transition-all shadow-[0_0_20px_rgba(96,107,210,0.4)]">
                Get Early Access
              </button>
              <button className="w-full sm:w-auto h-12 px-8 rounded-lg bg-surface hover:bg-surface-lighter border border-border-color text-white font-semibold transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-xl">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Preview from Stitch */}
        <div className="w-full max-w-5xl px-6 mb-32 relative">
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-background-dark via-transparent to-transparent z-10 pointer-events-none" />
          <div className="relative rounded-xl border border-border-color bg-surface/50 backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Top bar of abstract UI */}
            <div className="h-10 border-b border-border-color bg-surface-lighter/50 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              <div className="ml-4 h-4 w-64 bg-surface rounded text-[10px] flex items-center px-2 text-slate-400 font-mono">
                app.spec10x.com/project/alpha
              </div>
            </div>
            {/* Body of abstract UI */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center bg-[url('https://placeholder.pics/svg/800x400/121212-1e1e1e/2a2a2a')] bg-cover bg-center">
              <div className="w-full md:w-1/2 bg-background-dark/80 p-5 rounded-lg border border-border-color backdrop-blur">
                <div className="h-4 w-1/3 bg-slate-700/50 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-800/80 rounded"></div>
                  <div className="h-3 w-5/6 bg-slate-800/80 rounded"></div>
                  <div className="h-3 w-4/6 bg-slate-800/80 rounded"></div>
                  <div className="h-3 w-full bg-slate-800/80 rounded mt-4"></div>
                  <div className="h-3 w-3/4 bg-slate-800/80 rounded"></div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center text-primary/50 relative w-12">
                <span className="material-symbols-outlined text-3xl">arrow_forward</span>
              </div>
              <div className="w-full md:w-1/2 bg-background-dark/80 p-5 rounded-lg border border-primary/30 backdrop-blur shadow-[0_0_30px_rgba(96,107,210,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 blur-[30px]"></div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 rounded-sm bg-primary/20 border border-primary/50"></div>
                  <div className="h-4 w-1/2 bg-slate-600/50 rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-blue-500/20 rounded border border-blue-500/30"></div>
                    <div className="h-5 w-20 bg-purple-500/20 rounded border border-purple-500/30"></div>
                  </div>
                  <div className="h-3 w-full bg-slate-700/50 rounded mt-4"></div>
                  <div className="h-3 w-full bg-slate-700/50 rounded"></div>
                  <div className="h-3 w-2/3 bg-slate-700/50 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Metrics from Stitch */}
        <section className="w-full max-w-6xl mx-auto px-6 mb-32 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
              <p className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">10x</p>
              <p className="text-slate-400 font-medium text-center">Faster Spec Writing</p>
            </div>
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
              <p className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">99%</p>
              <p className="text-slate-400 font-medium text-center">Feature Accuracy</p>
            </div>
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
              <p className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">100%</p>
              <p className="text-slate-400 font-medium text-center">Engineering Alignment</p>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <div className="w-full border-y border-border-color bg-surface mb-32 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
          <div className="max-w-[1200px] mx-auto overflow-x-auto">
            <div className="flex min-w-[600px] items-center justify-between py-8 px-6 relative">
              <PipelineStep id="phase-discover" icon="[↑]" label="Discover"
                hoverClasses="group-hover:text-primary group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(96,107,210,0.4)]"
                activeClasses="text-primary border-primary"
                boxShadow="0 0 15px rgba(96,107,210,0.4)"
              />
              <div className="h-[1px] flex-1 bg-border-color mx-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse" />
              </div>

              <PipelineStep id="phase-synthesize" icon="[⊕]" label="Synthesize"
                hoverClasses="group-hover:text-accent group-hover:border-accent group-hover:shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                activeClasses="text-accent border-accent"
                boxShadow="0 0 15px rgba(0,194,255,0.3)"
              />
              <div className="h-[1px] flex-1 bg-border-color mx-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-pulse" />
              </div>

              <PipelineStep id="phase-specify" icon="[⬡]" label="Specify"
                hoverClasses="group-hover:text-amber-400 group-hover:border-amber-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                activeClasses="text-amber-400 border-amber-400"
                boxShadow="0 0 15px rgba(251,191,36,0.3)"
              />
              <div className="h-[1px] flex-1 bg-border-color mx-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent animate-pulse" />
              </div>

              <PipelineStep id="phase-deliver" icon="[→]" label="Deliver"
                hoverClasses="group-hover:text-green-500 group-hover:border-green-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                activeClasses="text-green-500 border-green-500"
                boxShadow="0 0 15px rgba(16,185,129,0.3)"
              />
              <div className="h-[1px] flex-1 bg-border-color mx-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/40 to-transparent animate-pulse" />
              </div>

              <PipelineStep id="phase-learn" icon="[↻]" label="Learn"
                hoverClasses="group-hover:text-rose-400 group-hover:border-rose-400 group-hover:shadow-[0_0_15px_rgba(251,113,133,0.3)]"
                activeClasses="text-rose-400 border-rose-400"
                boxShadow="0 0 15px rgba(251,113,133,0.3)"
              />
            </div>
          </div>
        </div>

        {/* The Problem */}
        <div className="w-full max-w-[1200px] px-6 mb-32">
          <h2 className="text-3xl font-display font-bold text-white mb-2 text-center">The PM Workflow is Broken</h2>
          <p className="text-slate-400 text-center mb-12">Sound familiar?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-primary/60 mb-4 block">cloud_off</span>
              <h3 className="text-white font-semibold text-lg mb-2">Data is Scattered</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Interviews in Docs, analytics in Mixpanel, tickets in Zendesk — nothing talks to each other.</p>
            </div>
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-accent/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-accent/60 mb-4 block">schedule</span>
              <h3 className="text-white font-semibold text-lg mb-2">Synthesis is Manual</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Days spent re-reading transcripts, hand-tagging themes, and building spreadsheets.</p>
            </div>
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-amber-400/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-amber-400/60 mb-4 block">casino</span>
              <h3 className="text-white font-semibold text-lg mb-2">Prioritization is Gut-Driven</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Without connected data, decisions rely on the loudest voice in the room.</p>
            </div>
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-rose-400/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-rose-400/60 mb-4 block">edit_note</span>
              <h3 className="text-white font-semibold text-lg mb-2">Specs are Labor-Intensive</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Writing PRDs, creating mocks, breaking down tickets — all manual, all immediately stale.</p>
            </div>
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-green-500/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-green-500/60 mb-4 block">link_off</span>
              <h3 className="text-white font-semibold text-lg mb-2">No Feedback Loop</h3>
              <p className="text-slate-400 text-sm leading-relaxed">After shipping, no systematic way to connect outcomes to the original user signals.</p>
            </div>
            <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-purple-400/30 transition-all hover:-translate-y-1">
              <span className="material-symbols-outlined text-3xl text-purple-400/60 mb-4 block">smart_toy</span>
              <h3 className="text-white font-semibold text-lg mb-2">AI Agents Can't Read Specs</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Traditional PRDs are prose. Coding agents need structured, executable specifications.</p>
            </div>
          </div>
        </div>

        {/* Features Showcase */}
        <div id="features-section" className="w-full max-w-[1200px] px-6 mb-32">
          <div className="flex flex-col mb-16 text-center">
            <h2 className="text-3xl font-display font-bold text-white mb-4">Everything You Need to Ship What Matters</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">A single platform replacing your patchwork of spreadsheets, tagging tools, and gut feeling.</p>
          </div>

          <div className="mb-16 scroll-mt-24" id="phase-discover">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded border border-primary/20">01 Discover</span>
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">Ingest signals from everywhere</h3>
            <p className="text-slate-400 text-base mb-8 max-w-xl">Centralize every customer voice — from raw audio to analytics events — into one searchable library.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary/70 mb-4 block text-3xl">mic</span>
                <h4 className="text-white text-base font-semibold mb-2">Multi-Format Upload</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Transcripts, audio, video — auto-transcribed and parsed.</p>
              </div>
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary/70 mb-4 block text-3xl">support_agent</span>
                <h4 className="text-white text-base font-semibold mb-2">Support Ticket Import</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Zendesk, Intercom, Freshdesk — auto-sync from your support stack.</p>
              </div>
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-primary/70 mb-4 block text-3xl">monitoring</span>
                <h4 className="text-white text-base font-semibold mb-2">Analytics Connection</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Mixpanel, Amplitude, PostHog — quantitative data alongside qualitative.</p>
              </div>
            </div>
          </div>

          <div className="mb-16 scroll-mt-24" id="phase-synthesize">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[10px] text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded border border-accent/20">02 Synthesize</span>
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">AI finds patterns &amp; priorities</h3>
            <p className="text-slate-400 text-base mb-8 max-w-xl">Stop tagging by hand. AI identifies themes, correlates signals, and scores everything automatically.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-accent/30 transition-all">
                <span className="material-symbols-outlined text-accent/70 mb-4 block text-3xl">auto_awesome</span>
                <h4 className="text-white text-base font-semibold mb-2">Auto Theme Extraction</h4>
                <p className="text-slate-400 text-sm leading-relaxed">AI reads every line and clusters feedback into themes — no manual tagging.</p>
              </div>
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-accent/30 transition-all">
                <span className="material-symbols-outlined text-accent/70 mb-4 block text-3xl">join</span>
                <h4 className="text-white text-base font-semibold mb-2">Cross-Source Correlation</h4>
                <p className="text-slate-400 text-sm leading-relaxed">"Users complain about slow search" + "40% drop-off on search results." Connected automatically.</p>
              </div>
              <div className="p-6 rounded-xl bg-[linear-gradient(180deg,rgba(30,30,30,0.4)0%,rgba(18,18,18,0.8)100%)] border border-border-color hover:border-accent/30 transition-all">
                <span className="material-symbols-outlined text-accent/70 mb-4 block text-3xl">speed</span>
                <h4 className="text-white text-base font-semibold mb-2">Impact Scoring</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Every theme gets an evidence-backed score: frequency × urgency × revenue impact.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing from Original mapped to Stitch UI */}
        <div id="pricing-section" className="w-full max-w-[1200px] px-6 mb-32">
          <h2 className="text-3xl font-display font-medium text-white mb-12 text-center">Transparent Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

            {/* Starter Tier */}
            <div className="p-8 bg-surface border border-border-color rounded-xl flex flex-col gap-6">
              <div>
                <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-2">Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-white">$0</span>
                  <span className="text-slate-400 text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 flex-1">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Up to 3 projects</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> 50 uploads/month</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Basic theme extraction</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Markdown export</li>
              </ul>
              <button className="w-full py-2 border border-border-color rounded-lg text-sm text-slate-100 hover:bg-white/5 transition-colors font-semibold">Start Free</button>
            </div>

            {/* Pro Tier (Highlighted) */}
            <div className="p-8 bg-background-dark border border-transparent rounded-xl flex flex-col gap-6 relative shadow-[0_0_30px_rgba(94,106,210,0.2)] transform md:scale-105 z-10"
              style={{ background: 'linear-gradient(#080808, #080808) padding-box, linear-gradient(135deg, #606bd2 0%, #00c2ff 100%) border-box', borderWidth: '2px' }}>
              <div className="absolute top-0 right-0 bg-primary/20 backdrop-blur-sm border-l border-b border-primary/30 text-primary text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-[9px] uppercase tracking-wide">
                Most Popular
              </div>
              <div>
                <h3 className="text-transparent bg-clip-text bg-primary-gradient font-mono uppercase tracking-widest text-xs mb-2">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-white">$49</span>
                  <span className="text-slate-400 text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-white flex-1">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary">check</span> Unlimited projects</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary">check</span> All integrations</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary">check</span> Impact scoring &amp; priority board</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-primary">check</span> Spec generation + agent export</li>
              </ul>
              <button className="w-full py-3 bg-primary-gradient text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(94,106,210,0.4)]">
                Get Pro
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="p-8 bg-surface border border-border-color rounded-xl flex flex-col gap-6">
              <div>
                <h3 className="text-slate-400 font-mono uppercase tracking-widest text-xs mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-white">Custom</span>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-slate-400 flex-1">
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Everything in Pro</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Unlimited seats, SSO/SAML</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Custom API + webhooks</li>
                <li className="flex items-center gap-2"><span className="material-symbols-outlined text-base">check</span> Dedicated CSM</li>
              </ul>
              <button className="w-full py-2 border border-border-color rounded-lg text-sm text-slate-100 hover:bg-white/5 transition-colors font-semibold">Contact Sales</button>
            </div>

          </div>
        </div>

        {/* Final CTA */}
        <div className="w-full max-w-[1200px] px-6 mb-32">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-surface to-accent/5" />
            <div className="absolute inset-[1px] rounded-2xl bg-background-dark/80 backdrop-blur-md" />
            <div className="relative py-20 px-8 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-6 opacity-60">auto_awesome</span>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 max-w-2xl tracking-tight">Ready to Build with Precision?</h2>
              <p className="text-slate-400 max-w-md mb-8 leading-relaxed text-lg">Join hundreds of product teams shipping better specs, faster. Get early access to Spec10x today.</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="h-12 px-8 bg-primary hover:bg-primary-glow text-white text-base font-bold rounded-lg shadow-neon transition-all duration-300 flex items-center gap-2">
                  Get Early Access
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <span className="text-slate-400 text-sm mt-6">Free to start · No credit card required</span>
            </div>
          </div>
        </div>

        <footer className="w-full border-t border-border-color bg-surface py-12">
          <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 text-slate-600">
                <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
                </svg>
              </div>
              <span className="text-slate-500 text-sm">© 2024 Spec10x Inc.</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <a className="hover:text-slate-300 transition-colors" href="#">Privacy</a>
              <a className="hover:text-slate-300 transition-colors" href="#">Terms</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
