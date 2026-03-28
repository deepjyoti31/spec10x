export default function HomePage() {
    return (
        <div className="p-8 space-y-8 max-w-full">

            {/* ── ROW 1: Stat Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col group hover:border-[#4F8CFF]/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[#8B8D97] text-[13px] font-medium">Interviews</span>
                        <span className="material-symbols-outlined text-[#8B8D97] group-hover:text-[#4F8CFF] transition-colors" style={{ fontSize: 20 }}>folder_open</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-bold text-[#F0F0F3] tracking-tight leading-none">47</span>
                        <span className="text-[12px] font-semibold text-[#34D399]">+3 this week</span>
                    </div>
                </div>

                <div className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col group hover:border-[#4F8CFF]/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[#8B8D97] text-[13px] font-medium">Active Themes</span>
                        <span className="material-symbols-outlined text-[#8B8D97] group-hover:text-[#4F8CFF] transition-colors" style={{ fontSize: 20 }}>lightbulb</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-bold text-[#F0F0F3] tracking-tight leading-none">12</span>
                        <span className="text-[12px] font-semibold text-[#34D399]">+2 new</span>
                    </div>
                </div>

                <div className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col group hover:border-[#4F8CFF]/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[#8B8D97] text-[13px] font-medium">Signals</span>
                        <span className="material-symbols-outlined text-[#8B8D97] group-hover:text-[#4F8CFF] transition-colors" style={{ fontSize: 20 }}>inbox</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-bold text-[#F0F0F3] tracking-tight leading-none">156</span>
                        <span className="text-[12px] text-[#8B8D97]">across 3 sources</span>
                    </div>
                </div>

                <div className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col group hover:border-[#4F8CFF]/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[#8B8D97] text-[13px] font-medium">Avg Impact Score</span>
                        <span className="material-symbols-outlined text-[#8B8D97] group-hover:text-[#4F8CFF] transition-colors" style={{ fontSize: 20 }}>trending_up</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[32px] font-bold text-[#F0F0F3] tracking-tight leading-none">8.4</span>
                        <span className="text-[12px] font-semibold text-[#34D399]">↑ 0.6 vs last week</span>
                    </div>
                </div>

            </div>

            {/* ── ROW 2: Active Priorities + Recent Activity ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Active Priorities */}
                <section className="lg:col-span-7 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#1E2028]">
                        <h2 className="text-[#F0F0F3] font-semibold tracking-tight">Active Priorities</h2>
                        <a href="/board" className="text-[#4F8CFF] text-[13px] font-medium hover:underline flex items-center gap-1">
                            View Board
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </a>
                    </div>
                    <div className="divide-y divide-[#1E2028]">

                        <div className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] text-[#F0F0F3] font-medium">Onboarding Friction</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] font-bold">12 INTERVIEWS</span>
                                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold">CORE PRODUCT</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-bold text-[#34D399]">8.7 <span className="text-[10px]">↑</span></span>
                                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                                </div>
                                <div className="px-3 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] text-[11px] font-bold rounded-full">HIGH</div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] text-[#F0F0F3] font-medium">Search Performance</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] font-bold">8 INTERVIEWS</span>
                                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold">PERFORMANCE</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-bold text-[#34D399]">7.9 <span className="text-[10px]">↑</span></span>
                                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                                </div>
                                <div className="px-3 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] text-[11px] font-bold rounded-full">HIGH</div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] text-[#F0F0F3] font-medium">Mobile Responsiveness</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] font-bold">15 SIGNALS</span>
                                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold">UX</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-bold text-[#8B8D97]">7.2 <span className="text-[10px]">→</span></span>
                                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                                </div>
                                <div className="px-3 py-1 bg-white/5 text-[#8B8D97] text-[11px] font-bold rounded-full">MED</div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] text-[#F0F0F3] font-medium">API Documentation</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] font-bold">4 FEEDBACK</span>
                                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold">DEV-EXP</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-bold text-[#B0B2BA]">6.8 <span className="text-[10px]">↓</span></span>
                                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                                </div>
                                <div className="px-3 py-1 bg-white/5 text-[#8B8D97] text-[11px] font-bold rounded-full">MED</div>
                            </div>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex flex-col gap-1">
                                <span className="text-[14px] text-[#F0F0F3] font-medium">Billing Confusion</span>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] font-bold">22 TICKETS</span>
                                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold">REVENUE</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-bold text-[#34D399]">6.1 <span className="text-[10px]">↑</span></span>
                                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                                </div>
                                <div className="px-3 py-1 bg-white/5 text-[#8B8D97] text-[11px] font-bold rounded-full">LOW</div>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Recent Activity */}
                <section className="lg:col-span-5 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#1E2028]">
                        <h2 className="text-[#F0F0F3] font-semibold tracking-tight">Recent Activity</h2>
                        <a href="/feed" className="text-[#4F8CFF] text-[13px] font-medium hover:underline flex items-center gap-1">
                            View Feed
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </a>
                    </div>
                    <div className="px-6 py-6 relative">
                        {/* Vertical timeline line */}
                        <div className="absolute left-[31px] top-6 bottom-6 w-[1px] bg-white/5" />
                        <ul className="space-y-6">

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#34D399] border-4 border-[#161820] z-10 mt-0.5 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">3 new interviews synced</span>
                                    <span className="text-[11px] text-[#8B8D97]">Intercom • 12m ago</span>
                                </div>
                            </li>

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#4F8CFF] border-4 border-[#161820] z-10 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">New theme discovered</span>
                                    <span className="text-[11px] text-[#8B8D97]">AI Insight Engine • 1h ago</span>
                                </div>
                            </li>

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#34D399] border-4 border-[#161820] z-10 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">Zendesk sync completed</span>
                                    <span className="text-[11px] text-[#8B8D97]">Integration • 3h ago</span>
                                </div>
                            </li>

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#ffb77b] border-4 border-[#161820] z-10 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">Theme declining: &ldquo;Performance&rdquo;</span>
                                    <span className="text-[11px] text-[#8B8D97]">Trend Alert • 5h ago</span>
                                </div>
                            </li>

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#4F8CFF] border-4 border-[#161820] z-10 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">Sarah Chen interview analyzed</span>
                                    <span className="text-[11px] text-[#8B8D97]">Transcription • 6h ago</span>
                                </div>
                            </li>

                            <li className="flex items-start gap-4 relative">
                                <div className="w-4 h-4 flex-shrink-0 rounded-full bg-[#34D399] border-4 border-[#161820] z-10 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-[13px] text-[#F0F0F3] font-medium">CSV survey imported</span>
                                    <span className="text-[11px] text-[#8B8D97]">Manual Upload • 8h ago</span>
                                </div>
                            </li>

                        </ul>
                    </div>
                </section>

            </div>

            {/* ── ROW 3: Emerging Trends + Pipeline Coming Soon ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Emerging Trends */}
                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6">
                    <h2 className="text-[#F0F0F3] font-semibold mb-6 tracking-tight">Emerging Trends</h2>
                    <div className="space-y-4">

                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#191b22] hover:bg-[#1e2030] transition-colors">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#34D399]/10 text-[#34D399] text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">New</span>
                                    <span className="text-[14px] text-[#F0F0F3] font-medium">Mobile Responsiveness</span>
                                </div>
                                <span className="text-[12px] text-[#8B8D97]">+14% velocity this week</span>
                            </div>
                            <svg className="text-[#4F8CFF] flex-shrink-0" fill="none" height="16" viewBox="0 0 40 16" width="40">
                                <path d="M1 15L8 10L15 13L22 4L29 7L39 1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#191b22] hover:bg-[#1e2030] transition-colors">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#34D399]/10 text-[#34D399] text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">New</span>
                                    <span className="text-[14px] text-[#F0F0F3] font-medium">Data Export Requests</span>
                                </div>
                                <span className="text-[12px] text-[#8B8D97]">+8% velocity this week</span>
                            </div>
                            <svg className="text-[#4F8CFF] flex-shrink-0" fill="none" height="16" viewBox="0 0 40 16" width="40">
                                <path d="M1 12L8 14L15 9L22 11L29 4L39 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#191b22] hover:bg-[#1e2030] transition-colors">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#34D399]/10 text-[#34D399] text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">New</span>
                                    <span className="text-[14px] text-[#F0F0F3] font-medium">Dark Mode Demand</span>
                                </div>
                                <span className="text-[12px] text-[#8B8D97]">+21% velocity this week</span>
                            </div>
                            <svg className="text-[#4F8CFF] flex-shrink-0" fill="none" height="16" viewBox="0 0 40 16" width="40">
                                <path d="M1 14L8 11L15 14L22 6L29 8L39 0.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>

                    </div>
                </section>

                {/* Pipeline Progress — Coming Soon */}
                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(79,140,255,0.06) 0%, transparent 70%)' }} />
                    <div className="relative z-10 flex flex-col items-center py-4">
                        <div className="w-16 h-16 rounded-full bg-[#1C1E28] flex items-center justify-center mb-4 border border-white/5">
                            <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 40 }}>lock</span>
                        </div>
                        <h3 className="text-[20px] font-bold text-[#F0F0F3] mb-1">Spec Pipeline</h3>
                        <span className="px-2 py-0.5 rounded-sm bg-[#4F8CFF]/20 text-[#4F8CFF] text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">Coming in v0.8</span>
                        <p className="text-[14px] text-[#5A5C66] max-w-xs mb-6">Automate the creation of PRDs and product specs directly from validated themes and user insights.</p>
                        <button className="px-6 py-2 border border-white/20 rounded-full text-[13px] font-semibold text-[#F0F0F3] hover:bg-white/5 transition-all">
                            Notify me
                        </button>
                    </div>
                </section>

            </div>

            {/* ── ROW 4: Outcome Tracking — Full-width Coming Soon ── */}
            <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(79,140,255,0.04) 0%, transparent 60%)' }} />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-[#1C1E28] flex items-center justify-center mb-6 border border-white/5">
                        <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 48 }}>lock</span>
                    </div>
                    <h3 className="text-[24px] font-bold text-[#F0F0F3] mb-2 tracking-tight">Outcome Tracking</h3>
                    <span className="px-3 py-1 rounded-sm bg-[#4F8CFF]/20 text-[#4F8CFF] text-[11px] font-bold uppercase tracking-widest mb-4 inline-block">Coming in v1.0</span>
                    <p className="text-[15px] text-[#5A5C66] max-w-lg mb-8 leading-relaxed">
                        Closing the feedback loop. Connect your post-launch metrics to historical themes and insights to measure the true ROI of your product decisions and iterate with precision.
                    </p>
                    <div className="flex gap-4">
                        <button className="px-8 py-2.5 bg-[#4F8CFF] text-white rounded-full text-[14px] font-bold hover:brightness-110 transition-all shadow-lg shadow-[#4F8CFF]/20">
                            Pre-register Interest
                        </button>
                        <button className="px-8 py-2.5 border border-white/20 rounded-full text-[14px] font-bold text-[#F0F0F3] hover:bg-white/5 transition-all">
                            Watch the Teaser
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
}
