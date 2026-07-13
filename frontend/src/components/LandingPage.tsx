import Link from 'next/link';

/* ─────────────────────────────────────────────
   Reusable placeholder for screenshots.
   The `label` text tells you exactly what to
   capture / create for that slot.
───────────────────────────────────────────── */
function ScreenshotPlaceholder({ label, aspect = 'video' }: { label: string; aspect?: 'video' | 'square' | 'tall' | 'wide' }) {
    const aspectClass = {
        video: 'aspect-video',
        square: 'aspect-square',
        tall: 'aspect-[3/4]',
        wide: 'aspect-[21/9]',
    }[aspect];

    return (
        <div className={`${aspectClass} rounded-xl border border-dashed border-[#2A2C38] bg-[#0F1117] flex flex-col items-center justify-center gap-3 p-8`}>
            <span className="material-symbols-outlined text-[#2A2C38]" style={{ fontSize: 36 }}>image</span>
            <p className="text-[12px] text-[#3A3C48] text-center leading-relaxed max-w-xs font-mono">
                {label}
            </p>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Section label / eyebrow
───────────────────────────────────────────── */
function Eyebrow({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#afc6ff]/30 bg-[#afc6ff]/8 mb-4">
            <span className="material-symbols-outlined text-[#afc6ff]" style={{ fontSize: 13 }}>{icon}</span>
            <span className="text-[11px] font-semibold text-[#afc6ff] uppercase tracking-widest">{text}</span>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const PAIN_POINTS = [
    {
        image: '/assets/landing/Discovery_Debt.jpeg',
        stat: '3 days',
        statLabel: 'average time to synthesize 20 interviews',
        title: 'Discovery Debt',
        description:
            'Customer insights are buried across Google Docs, Notion, Slack threads, Zendesk tickets, and survey exports. Every team member is working from a different slice of the truth.',
    },
    {
        image: '/assets/landing/Manual_Synthesis.jpeg',
        stat: '60%',
        statLabel: 'of PM time spent on non-decision work',
        title: 'Manual Synthesis',
        description:
            'Re-reading transcripts. Building theme trackers in spreadsheets. Copy-pasting quotes into Notion. Tagging by hand. Work that should have been automated years ago.',
    },
    {
        image: '/assets/landing/Misalignment.jpeg',
        stat: '73%',
        statLabel: 'of features don\'t move the metric they were meant to',
        title: 'Gut-Driven Priorities',
        description:
            'Without connected evidence, the roadmap belongs to whoever shouted loudest in the last meeting. HiPPO dynamics replace data-driven decisions.',
    },
];

const STEPS = [
    {
        number: '01',
        icon: 'upload_file',
        title: 'Discover',
        color: '#afc6ff',
        description: 'Upload interview transcripts, audio, or video. Connect Zendesk. Import NPS CSV exports. Every signal from every source, in one place.',
    },
    {
        number: '02',
        icon: 'auto_awesome',
        title: 'Synthesize',
        color: '#34D399',
        description: 'AI extracts themes, pain points, and feature requests, clustered across every source, ranked by urgency, each claim backed by exact quotes.',
    },
    {
        number: '03',
        icon: 'description',
        title: 'Specify',
        color: '#FBBF24',
        description: 'Generate feature briefs, acceptance criteria, and user stories. Every spec is grounded in real user evidence. No hallucinations, no fluff.',
    },
    {
        number: '04',
        icon: 'rocket_launch',
        title: 'Deliver',
        color: '#F87171',
        description: 'Export agent-ready task definitions for Cursor, Claude Code, or Devin. Sync to Linear, Jira, or GitHub Issues with full context bundles attached.',
    },
];

const FEATURES = [
    {
        eyebrow: { icon: 'upload_file', text: 'Interview Intelligence' },
        headline: 'Upload anything. Get insights in minutes.',
        body: [
            'Drop in transcripts, audio, or video files. Spec10x auto-transcribes audio and video, extracts speaker turns, and runs AI analysis, all in the background while you do other work.',
            'Every interview is processed into structured insights: themes, pain points, feature requests, and sentiment. With timestamps. With citations. With confidence scores.',
            'What used to take a researcher three days now takes five minutes.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'Supports .txt, .md, .pdf, .docx, .mp3, .wav, .mp4' },
            { icon: 'check_circle', text: 'Batch upload up to 50 files at once' },
            { icon: 'check_circle', text: 'Multilingual: processes interviews in any language' },
            { icon: 'check_circle', text: 'Auto-detects speakers via diarization' },
        ],
        imagePath: '/assets/landing/Interview-Intelligence.png',
        imageRight: true,
    },
    {
        eyebrow: { icon: 'hub', text: 'AI Synthesis' },
        headline: 'AI finds patterns across every source. You just read the report.',
        body: [
            'Spec10x clusters related feedback across all your interviews, support tickets, and surveys into unified themes. One theme card might show "Onboarding confusion" mentioned in 8 interviews, 34 Zendesk tickets, and 12 NPS responses, with an Impact Score that factors in frequency, urgency, and user segment.',
            'Every theme links to every piece of evidence that supports it. Click any claim and see the exact quote, from the exact source, with surrounding context. No black boxes.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'Cross-source theme clustering: interviews, tickets, surveys together' },
            { icon: 'check_circle', text: 'Impact Score: urgency × frequency × segment weight' },
            { icon: 'check_circle', text: 'Sentiment split detection: surfaces polarizing themes' },
            { icon: 'check_circle', text: 'Evidence trails to exact quotes in original source' },
        ],
        imagePath: '/assets/landing/AI-Synthesis.png',
        imageRight: false,
    },
    {
        eyebrow: { icon: 'feed', text: 'Unified Evidence Feed' },
        headline: 'One timeline for every signal, from every source.',
        body: [
            'Your interviews, support tickets, and survey responses now live in a single chronological feed. Filter by source type, date range, sentiment, or theme. Search across everything at once.',
            'No more bouncing between five tools to get a full picture of what your users are experiencing right now. The feed updates continuously as new data comes in.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'Interviews, Zendesk tickets, and NPS surveys in one stream' },
            { icon: 'check_circle', text: 'Source-type badges and sentiment indicators on every item' },
            { icon: 'check_circle', text: 'Filter by theme, source, date, or sentiment' },
            { icon: 'check_circle', text: 'Continuous ingestion: stays up to date automatically' },
        ],
        imagePath: '/assets/landing/Unified-feed.png',
        imageRight: true,
    },
    {
        eyebrow: { icon: 'dashboard', text: 'Priority Board' },
        headline: 'Stop debating the roadmap. Let evidence rank it.',
        body: [
            'The Priority Board surfaces your top themes ranked by Impact Score, a composite of how many users mentioned it, how urgently they expressed the need, and what segments they belong to.',
            'Pin themes your team is committed to. Mark others as monitoring. Move cards between triage columns. Every decision is visible, auditable, and backed by the evidence behind it.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'AI-ranked themes by Impact Score (urgency × frequency × segment)' },
            { icon: 'check_circle', text: 'Pin, monitor, or triage themes across the board' },
            { icon: 'check_circle', text: 'One-click evidence panel: see every source supporting a theme' },
            { icon: 'check_circle', text: 'Score breakdown tooltip: exactly why the AI ranked it here' },
        ],
        imagePath: '/assets/landing/Priority-board.png',
        imageRight: false,
    },
];


const INTEGRATIONS = [
    { label: 'Zendesk', icon: 'support_agent' },
    { label: 'Linear', icon: 'linear_scale' },
    { label: 'Jira', icon: 'bug_report' },
    { label: 'GitHub', icon: 'code' },
    { label: 'Cursor', icon: 'terminal' },
    { label: 'Claude Code', icon: 'smart_toy' },
];

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#0F1117] text-[#F0F0F3]" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ══════════════════════════════════════
                NAV
            ══════════════════════════════════════ */}
            <nav className="sticky top-0 z-50 border-b border-[#1E2028] bg-[#0F1117]/95 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <img
                            src="/assets/logos/spec10x_logo_transparent_1080.png"
                            alt="Spec10x"
                            className="w-6 h-6 object-contain"
                        />
                        <span className="text-[16px] font-bold text-[#F0F0F3]">Spec10x</span>
                    </Link>

                    {/* Nav links */}
                    <div className="hidden md:flex items-center gap-6">
                        <a href="#how-it-works" className="text-[13px] text-[#8B8D97] hover:text-[#F0F0F3] transition-colors">How it works</a>
                        <a href="#features" className="text-[13px] text-[#8B8D97] hover:text-[#F0F0F3] transition-colors">Features</a>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-[13px] font-medium text-[#8B8D97] hover:text-[#F0F0F3] transition-colors">
                            Sign in
                        </Link>
                        <Link
                            href="/signup"
                            className="h-8 px-4 rounded hover:brightness-110 text-[13px] font-semibold transition-all flex items-center"
                            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                        >
                            Get started free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════
                HERO
            ══════════════════════════════════════ */}
            <section className="relative overflow-hidden grid-lines">
                <div className="absolute inset-0 hero-gradient pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0F1117] pointer-events-none" />

                <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-0 text-center">

                    {/* Headline */}
                    <h1 className="text-[62px] font-black leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
                        Your team deserves to know{' '}
                        <span className="primary-gradient-text">what to build next.</span>
                        {' '}Not guess.
                    </h1>

                    {/* Subheadline */}
                    <p className="text-[18px] text-[#8B8D97] leading-relaxed max-w-2xl mx-auto mb-10">
                        Spec10x is the AI-native platform that turns raw customer interviews,
                        support tickets, and surveys into prioritized themes, evidence-backed specs,
                        and agent-ready tasks. In minutes, not weeks.
                    </p>
                    {/* CTAs */}
                    <div className="flex items-center justify-center gap-4 mb-16">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 h-12 px-7 rounded hover:brightness-110 text-[15px] font-semibold transition-all"
                            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                        >
                            Get started free
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center gap-2 h-12 px-7 rounded border border-[#1E2028] hover:border-[rgba(175,198,255,0.5)] hover:bg-[#161820] text-[#c2c6d6] text-[15px] font-medium transition-all"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
                            See how it works
                        </a>
                    </div>

                    {/* Hero screenshot */}
                    <div className="rounded-t-xl overflow-hidden border border-b-0 border-[#1E2028] shadow-2xl mx-auto max-w-5xl">
                        <img
                            src="/assets/landing/spec10x_Hero.png"
                            alt="Spec10x dashboard"
                            className="w-full object-cover object-top"
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                PAIN — THE STATUS QUO
            ══════════════════════════════════════ */}
            <section className="py-24 border-t border-[#1E2028]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <Eyebrow icon="warning" text="The Problem" />
                        <h2 className="text-[40px] font-bold leading-tight mb-4">
                            While your competitors ship,<br />
                            you&rsquo;re still in spreadsheets.
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-xl mx-auto">
                            Modern product teams are drowning in data they can&rsquo;t use, making
                            decisions based on vibes instead of evidence.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-12">
                        {PAIN_POINTS.map((point) => (
                            <div
                                key={point.title}
                                className="rounded-xl border border-[#1E2028] bg-[#161820] overflow-hidden hover:border-[#2A2C38] transition-colors group"
                            >
                                {/* Image */}
                                <div className="aspect-video overflow-hidden">
                                    <img
                                        src={point.image}
                                        alt={point.title}
                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                    />
                                </div>
                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="text-[15px] font-semibold text-[#F0F0F3] mb-2">{point.title}</h3>
                                    <p className="text-[13px] text-[#8B8D97] leading-relaxed">{point.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* ══════════════════════════════════════
                HOW IT WORKS — THE LOOP
            ══════════════════════════════════════ */}
            <section id="how-it-works" className="py-24 border-t border-[#1E2028] bg-[#161820]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <Eyebrow icon="loop" text="How It Works" />
                        <h2 className="text-[40px] font-bold leading-tight mb-4">
                            One continuous loop.<br />From signal to shipped.
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-xl mx-auto">
                            Spec10x connects every stage of product discovery into a single platform,
                            so nothing falls through the cracks between your users and your engineers.
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-4 gap-px bg-[#1E2028] rounded-xl overflow-hidden mb-12">
                        {STEPS.map((step) => (
                            <div key={step.number} className="bg-[#161820] p-6 flex flex-col">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                    style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: step.color }}>
                                        {step.icon}
                                    </span>
                                </div>
                                <div className="text-[11px] font-mono mb-1" style={{ color: step.color }}>{step.number}</div>
                                <h3 className="text-[16px] font-bold text-[#F0F0F3] mb-2">{step.title}</h3>
                                <p className="text-[13px] text-[#8B8D97] leading-relaxed">{step.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Loop diagram */}
                    <img
                        src="/assets/landing/flow-diagram.jpeg"
                        alt="Spec10x product loop: Discover → Synthesize → Specify → Deliver → Learn"
                        className="w-full"
                    />
                </div>
            </section>

            {/* ══════════════════════════════════════
                FEATURE DEEP DIVES
            ══════════════════════════════════════ */}
            <section id="features" className="py-8">
                {FEATURES.map((feature, i) => (
                    <div
                        key={feature.headline}
                        className={`py-20 border-t border-[#1E2028] overflow-hidden ${i % 2 === 1 ? 'bg-[#161820]' : ''}`}
                    >
                        <div className="max-w-screen-xl mx-auto">
                            <div className={`grid items-center gap-16 ${feature.imageRight ? 'grid-cols-[2fr_3fr]' : 'grid-cols-[3fr_2fr]'}`}>
                                {/* Text */}
                                <div className={`${feature.imageRight ? 'order-1 pl-16' : 'order-2 pr-16'}`}>
                                    <Eyebrow icon={feature.eyebrow.icon} text={feature.eyebrow.text} />
                                    <h2 className="text-[32px] font-bold leading-tight mb-5">
                                        {feature.headline}
                                    </h2>
                                    <div className="space-y-4 mb-6">
                                        {feature.body.map((paragraph, j) => (
                                            <p key={j} className="text-[15px] text-[#8B8D97] leading-relaxed">
                                                {paragraph}
                                            </p>
                                        ))}
                                    </div>
                                    <ul className="space-y-2">
                                        {feature.bullets.map((bullet) => (
                                            <li key={bullet.text} className="flex items-center gap-3 text-[14px] text-[#F0F0F3]">
                                                <span className="material-symbols-outlined text-[#34D399] shrink-0" style={{ fontSize: 16 }}>
                                                    {bullet.icon}
                                                </span>
                                                {bullet.text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Screenshot */}
                                <div className={`${feature.imageRight ? 'order-2 pr-8' : 'order-1 pl-8'}`}>
                                    <div className="rounded-xl overflow-hidden border border-[#1E2028] shadow-2xl">
                                        <img
                                            src={feature.imagePath}
                                            alt={feature.eyebrow.text}
                                            className="w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* ══════════════════════════════════════
                ASK AI — FULL WIDTH FEATURE
            ══════════════════════════════════════ */}
            <section className="py-24 border-t border-[#1E2028]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <Eyebrow icon="chat" text="Ask AI" />
                        <h2 className="text-[40px] font-bold leading-tight mb-4">
                            Ask anything about your users.<br />
                            Get answers backed by real evidence.
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-2xl mx-auto">
                            Ask AI searches across every interview, ticket, and survey you&apos;ve
                            ingested and returns grounded answers, with inline citations linking
                            directly to the sources. No hallucinations. Only your data.
                        </p>
                    </div>

                    {/* Example queries */}
                    <div className="grid grid-cols-3 gap-3 mb-10">
                        {[
                            'What are the top 3 onboarding pain points across enterprise users?',
                            'Which features are most requested by churned customers in the last 90 days?',
                            'What do users say about our mobile experience vs. desktop?',
                        ].map((query) => (
                            <div key={query} className="rounded-lg border border-[#1E2028] bg-[#161820] p-4 flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#afc6ff] shrink-0 mt-0.5" style={{ fontSize: 16 }}>search</span>
                                <p className="text-[13px] text-[#8B8D97] leading-relaxed italic">&ldquo;{query}&rdquo;</p>
                            </div>
                        ))}
                    </div>

                    {/* Ask AI screenshot */}
                    <div className="max-w-3xl mx-auto rounded-xl overflow-hidden border border-[#1E2028] shadow-2xl">
                        <img
                            src="/assets/landing/ask-ai.png"
                            alt="Ask AI interface"
                            className="w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                AI CODING ERA — AGENT HANDOFF
            ══════════════════════════════════════ */}
            <section className="py-24 border-t border-[#1E2028] bg-[#161820]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 gap-16 items-center">
                        {/* Text */}
                        <div>
                            <Eyebrow icon="smart_toy" text="Built for the AI coding era" />
                            <h2 className="text-[36px] font-bold leading-tight mb-5">
                                Your specs go straight to<br />
                                Cursor. Your engineers. Your agents.
                            </h2>
                            <p className="text-[15px] text-[#8B8D97] leading-relaxed mb-5">
                                Traditional PRDs are prose designed for humans. They&apos;re useless to
                                AI coding agents. Spec10x generates structured, precise, executable
                                specifications that Cursor, Claude Code, and Devin can actually consume.
                            </p>
                            <p className="text-[15px] text-[#8B8D97] leading-relaxed mb-8">
                                Each task ships with a context bundle: the relevant user quotes,
                                design references, acceptance criteria, and data points. Your
                                agents never have to guess what the user actually needs.
                            </p>

                            {/* Integration logos */}
                            <p className="text-[12px] font-semibold text-[#5A5C66] uppercase tracking-wider mb-4">Works with</p>
                            <div className="flex flex-wrap gap-3">
                                {INTEGRATIONS.map((integration) => (
                                    <div
                                        key={integration.label}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2C38] bg-[#0F1117] text-[13px] text-[#8B8D97]"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{integration.icon}</span>
                                        {integration.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CSS visual — agent task card mockup */}
                        <div className="rounded-xl border border-[#2A2C38] bg-[#0F1117] p-5 shadow-2xl space-y-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>

                            {/* Window chrome */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                                <span className="ml-3 text-[11px] text-[#5A5C66]">spec10x — task-bundle.json</span>
                            </div>

                            {/* Task card */}
                            <div className="rounded-lg border border-[#afc6ff]/20 bg-[#afc6ff]/5 p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-[13px] font-semibold text-[#F0F0F3]">Redesign onboarding: Step 2</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/20">High priority</span>
                                </div>
                                <div className="space-y-2 mb-3">
                                    <p className="text-[11px] text-[#5A5C66] uppercase tracking-widest">User evidence</p>
                                    <div className="rounded bg-[#161820] border border-[#1E2028] px-3 py-2">
                                        <p className="text-[12px] text-[#8B8D97] italic leading-relaxed">&ldquo;I had no idea what to do on the second screen. Nothing made sense.&rdquo;</p>
                                        <p className="text-[10px] text-[#5A5C66] mt-1">Interview #14, Acme Corp</p>
                                    </div>
                                    <div className="rounded bg-[#161820] border border-[#1E2028] px-3 py-2">
                                        <p className="text-[12px] text-[#8B8D97] italic leading-relaxed">&ldquo;Dropped off at the workspace setup step every time.&rdquo;</p>
                                        <p className="text-[10px] text-[#5A5C66] mt-1">Zendesk #4892 · 34 similar tickets</p>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mb-4">
                                    <p className="text-[11px] text-[#5A5C66] uppercase tracking-widest">Acceptance criteria</p>
                                    {[
                                        'User can complete step 2 in under 60 seconds',
                                        'Progress indicator visible at all times',
                                        'Skip option available with clear consequences shown',
                                    ].map(c => (
                                        <div key={c} className="flex items-start gap-2">
                                            <span className="material-symbols-outlined text-[#34D399] shrink-0 mt-0.5" style={{ fontSize: 13 }}>check_box_outline_blank</span>
                                            <p className="text-[12px] text-[#8B8D97]">{c}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 pt-3 border-t border-[#1E2028]">
                                    <p className="text-[11px] text-[#5A5C66] mr-1">Export to</p>
                                    {['Cursor', 'Claude Code', 'Linear'].map(tool => (
                                        <span key={tool} className="text-[11px] px-2 py-0.5 rounded border border-[#2A2C38] bg-[#161820] text-[#8B8D97]">
                                            {tool}
                                        </span>
                                    ))}
                                    <div className="ml-auto flex items-center gap-1 text-[11px] text-[#afc6ff]">
                                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                                        Coming soon
                                    </div>
                                </div>
                            </div>

                            {/* Collapsed tasks */}
                            {['Simplify workspace setup form', 'Add inline help tooltips'].map(title => (
                                <div key={title} className="rounded-lg border border-[#1E2028] bg-[#161820] px-4 py-3 flex items-center justify-between">
                                    <p className="text-[12px] text-[#8B8D97]">{title}</p>
                                    <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 16 }}>expand_more</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                THE PM TRANSFORMATION — VISION
            ══════════════════════════════════════ */}
            <section className="py-24 border-t border-[#1E2028]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <Eyebrow icon="trending_up" text="The Bigger Picture" />
                        <h2 className="text-[40px] font-bold leading-tight mb-4">
                            Product management is being reinvented.<br />
                            <span className="primary-gradient-text">Be on the right side of it.</span>
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-2xl mx-auto">
                            AI coding agents are getting better every month. The bottleneck is
                            shifting: from &ldquo;how do we build it?&rdquo; to &ldquo;what should we build?&rdquo;
                            The PMs who answer that question with evidence will define their company&apos;s roadmap.
                            The ones who don&apos;t will be replaced by the ones who do.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {[
                            {
                                icon: 'speed',
                                color: '#afc6ff',
                                title: '10× faster synthesis',
                                description:
                                    'What used to take 3 days of manual work takes 5 minutes. Upload, wait, read your insights. Then spend the rest of the week on decisions.',
                            },
                            {
                                icon: 'verified',
                                color: '#34D399',
                                title: 'Evidence in every room',
                                description:
                                    'Walk into every stakeholder meeting, sprint planning, and roadmap review with the data to back up every priority you propose.',
                            },
                            {
                                icon: 'group',
                                color: '#FBBF24',
                                title: 'One source of truth for the team',
                                description:
                                    'Sales, CS, engineering, and leadership all working from the same signal layer. No more "well the customer I spoke to said..."',
                            },
                            {
                                icon: 'insights',
                                color: '#F87171',
                                title: 'Trends before they\'re trends',
                                description:
                                    'Spec10x tracks theme velocity over time. You\'ll know when something is emerging, before it blows up in your NPS or your churn.',
                            },
                            {
                                icon: 'link',
                                color: '#afc6ff',
                                title: 'Full traceability',
                                description:
                                    'From user quote → prioritized theme → approved spec → shipped feature → measured impact. Every step of the chain is visible and auditable.',
                            },
                            {
                                icon: 'rocket_launch',
                                color: '#34D399',
                                title: 'Agent-ready from day one',
                                description:
                                    'Your specs don\'t need to be translated for AI coding agents. Spec10x outputs structured, precise, executable context that Cursor understands natively.',
                            },
                        ].map((card) => (
                            <div key={card.title} className="rounded-xl border border-[#1E2028] bg-[#161820] p-6">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: card.color }}>{card.icon}</span>
                                </div>
                                <h3 className="text-[15px] font-semibold text-[#F0F0F3] mb-2">{card.title}</h3>
                                <p className="text-[13px] text-[#8B8D97] leading-relaxed">{card.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Before/after callout */}
                    <div className="grid grid-cols-2 gap-4 mt-12">
                        <div className="rounded-xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 p-6">
                            <p className="text-[12px] font-semibold text-[#ffb4ab] uppercase tracking-widest mb-4">Before Spec10x</p>
                            <ul className="space-y-3">
                                {[
                                    'Re-read 20 interviews manually over 3 days',
                                    'Build a theme tracker in Airtable by hand',
                                    'Debate the roadmap in a 2-hour meeting with no data',
                                    'Write a PRD in Notion that\'s stale before it ships',
                                    'Explain to engineers what the user actually needs',
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-3 text-[13px] text-[#8B8D97]">
                                        <span className="material-symbols-outlined text-[#ffb4ab] shrink-0 mt-0.5" style={{ fontSize: 16 }}>close</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-xl border border-[#34D399]/20 bg-[#34D399]/5 p-6">
                            <p className="text-[12px] font-semibold text-[#34D399] uppercase tracking-widest mb-4">After Spec10x</p>
                            <ul className="space-y-3">
                                {[
                                    'Upload 20 interviews: AI synthesizes in under 5 minutes',
                                    'AI clusters themes across all sources automatically',
                                    'Open the Priority Board. Evidence ranks the roadmap for you',
                                    'Generate an evidence-backed spec in seconds',
                                    'Export agent-ready tasks directly to Cursor or Claude Code',
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-3 text-[13px] text-[#8B8D97]">
                                        <span className="material-symbols-outlined text-[#34D399] shrink-0 mt-0.5" style={{ fontSize: 16 }}>check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>


            {/* ══════════════════════════════════════
                FINAL CTA
            ══════════════════════════════════════ */}
            <section className="py-24 border-t border-[#1E2028] relative overflow-hidden">
                <div className="absolute inset-0 grid-lines pointer-events-none opacity-50" />
                <div className="absolute inset-0 hero-gradient pointer-events-none" />
                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-[52px] font-black leading-[1.05] tracking-tight mb-5">
                        Your users are telling you<br />
                        <span className="primary-gradient-text">exactly what to build.</span>
                    </h2>
                    <p className="text-[17px] text-[#8B8D97] leading-relaxed mb-10">
                        Stop guessing. Stop debating. Start building the right things, backed by
                        evidence from every customer conversation you&apos;ve ever had.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 px-8 rounded hover:brightness-110 text-[16px] font-bold transition-all"
                            style={{ backgroundColor: '#afc6ff', color: '#002d6c', height: 52 }}
                        >
                            Start for free. No card required.
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                        </Link>
                    </div>
                    <p className="text-[13px] text-[#5A5C66] mt-4">
                        Free tier includes 10 interviews forever. Upgrade anytime.
                    </p>
                </div>
            </section>

            {/* ══════════════════════════════════════
                FOOTER
            ══════════════════════════════════════ */}
            <footer className="border-t border-[#1E2028] py-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <img
                                src="/assets/logos/spec10x_logo_transparent_1080.png"
                                alt="Spec10x"
                                className="w-5 h-5 object-contain"
                            />
                            <span className="text-[14px] font-bold text-[#F0F0F3]">Spec10x</span>
                        </Link>
                        <div className="flex items-center gap-6">
                            <a href="#how-it-works" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">How it works</a>
                            <a href="#features" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Features</a>
<Link href="/privacy" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Privacy</Link>
                            <Link href="/terms" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Terms</Link>
                        </div>
                    </div>
                    <div className="border-t border-[#1E2028] pt-6 flex items-center justify-between">
                        <p className="text-[12px] text-[#5A5C66]">© {new Date().getFullYear()} Spec10x. All rights reserved.</p>
                        <p className="text-[12px] text-[#5A5C66] italic">The Cursor for Product Management.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
