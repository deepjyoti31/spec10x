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
            'Customer insights are buried across Google Docs, Notion, Slack threads, Zendesk tickets, and survey exports — each team member working from a different slice of the truth.',
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
        description: 'AI extracts themes, pain points, and feature requests — clustered across every source, ranked by urgency, each claim backed by exact quotes.',
    },
    {
        number: '03',
        icon: 'description',
        title: 'Specify',
        color: '#FBBF24',
        description: 'Generate feature briefs, acceptance criteria, and user stories. Every spec is grounded in real user evidence — no hallucinations, no fluff.',
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
            'Drop in transcripts, audio, or video files. Spec10x auto-transcribes audio and video, extracts speaker turns, and runs AI analysis — all in the background while you do other work.',
            'Every interview is processed into structured insights: themes, pain points, feature requests, and sentiment. With timestamps. With citations. With confidence scores.',
            'What used to take a researcher three days now takes five minutes.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'Supports .txt, .md, .pdf, .docx, .mp3, .wav, .mp4' },
            { icon: 'check_circle', text: 'Batch upload up to 50 files at once' },
            { icon: 'check_circle', text: 'Multilingual — processes interviews in any language' },
            { icon: 'check_circle', text: 'Auto-detects speakers via diarization' },
        ],
        screenshot: 'SCREENSHOT: Upload modal open, showing 4 files being processed simultaneously. Each file has a progress bar, a "Live insights" streaming panel on the right showing themes appearing in real time. The modal shows file types: .mp4, .pdf, .txt, .docx. Bottom shows "12 insights found so far" counter incrementing.',
        imageRight: true,
    },
    {
        eyebrow: { icon: 'hub', text: 'AI Synthesis' },
        headline: 'AI finds patterns across every source — you just read the report.',
        body: [
            'Spec10x clusters related feedback across all your interviews, support tickets, and surveys into unified themes. One theme card might show "Onboarding confusion" mentioned in 8 interviews, 34 Zendesk tickets, and 12 NPS responses — with an Impact Score that factors in frequency, urgency, and user segment.',
            'Every theme links to every piece of evidence that supports it. Click any claim and see the exact quote, from the exact source, with surrounding context. No black boxes.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'Cross-source theme clustering — interviews, tickets, surveys together' },
            { icon: 'check_circle', text: 'Impact Score: urgency × frequency × segment weight' },
            { icon: 'check_circle', text: 'Sentiment split detection — surfaces polarizing themes' },
            { icon: 'check_circle', text: 'Evidence trails to exact quotes in original source' },
        ],
        screenshot: 'SCREENSHOT: Insights page showing a 2-column grid of theme cards. Top card "Onboarding Confusion" shows: Impact Score 94, 8 interviews + 34 tickets + 12 surveys, a bar showing 70% Pain / 20% Request / 10% Positive sentiment, and 3 evidence quote snippets. A right panel shows the full theme detail with all evidence grouped by source type.',
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
            { icon: 'check_circle', text: 'Continuous ingestion — stays up to date automatically' },
        ],
        screenshot: 'SCREENSHOT: Unified Feed page showing a vertical timeline of evidence items. Each item has a colored source badge (blue "Interview", orange "Zendesk", green "Survey"), a sentiment pill (Pain / Positive / Request), a short quote excerpt, and a theme tag. Left sidebar shows filter options: Source Type, Date Range, Sentiment, Theme. A search bar is at the top.',
        imageRight: true,
    },
    {
        eyebrow: { icon: 'dashboard', text: 'Priority Board' },
        headline: 'Stop debating the roadmap. Let evidence rank it.',
        body: [
            'The Priority Board surfaces your top themes ranked by Impact Score — a composite of how many users mentioned it, how urgently they expressed the need, and what segments they belong to.',
            'Pin themes your team is committed to. Mark others as monitoring. Move cards between triage columns. Every decision is visible, auditable, and backed by the evidence behind it.',
        ],
        bullets: [
            { icon: 'check_circle', text: 'AI-ranked themes by Impact Score (urgency × frequency × segment)' },
            { icon: 'check_circle', text: 'Pin, monitor, or triage themes across the board' },
            { icon: 'check_circle', text: 'One-click evidence panel — see every source supporting a theme' },
            { icon: 'check_circle', text: 'Score breakdown tooltip: exactly why the AI ranked it here' },
        ],
        screenshot: 'SCREENSHOT: Priority Board showing 4 columns: Critical, High, Medium, Monitoring. Each column has theme cards with an Impact Score badge, a mini bar chart showing source breakdown (interviews/tickets/surveys), a trend arrow (↑↓), and a "Pin" toggle. The top "Critical" card is expanded showing its Impact Score breakdown: Frequency 8.4, Urgency 9.1, Segment Weight 7.8.',
        imageRight: false,
    },
];

const PRICING_TIERS = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'For PMs who want to see the magic before committing.',
        highlight: false,
        cta: 'Get started',
        features: [
            '10 interviews (lifetime)',
            '20 AI Q&A queries / month',
            'Up to 15 min audio/video per file',
            'Markdown export',
            'Email support (7 business days)',
        ],
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month, billed annually',
        description: 'For individual PMs who need to move fast.',
        highlight: true,
        cta: 'Start 7-day trial',
        features: [
            '100 interviews / month',
            '500 AI Q&A queries / month',
            'Up to 30 min audio/video per file',
            'Markdown + PDF + structured spec export',
            '5 GB storage',
            'Email support (2 business days)',
        ],
    },
    {
        name: 'Business',
        price: '$79',
        period: '/user/month, billed annually',
        description: 'For teams making decisions together.',
        highlight: false,
        cta: 'Start 7-day trial',
        features: [
            'Unlimited interviews',
            'Unlimited AI Q&A queries',
            'Up to 45 min audio/video per file',
            'Unlimited storage',
            'Up to 20 team members',
            'All export formats',
            'Email + call support (1 business day)',
        ],
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
                        <a href="#pricing" className="text-[13px] text-[#8B8D97] hover:text-[#F0F0F3] transition-colors">Pricing</a>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-[13px] font-medium text-[#8B8D97] hover:text-[#F0F0F3] transition-colors">
                            Sign in
                        </Link>
                        <Link
                            href="/login"
                            className="h-8 px-4 rounded-lg bg-[#4F8CFF] hover:brightness-110 text-white text-[13px] font-semibold transition-all flex items-center"
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

                    {/* Eyebrow badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#afc6ff]/30 bg-[#afc6ff]/8 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#afc6ff] animate-pulse" />
                        <span className="text-[11px] font-semibold text-[#afc6ff] uppercase tracking-widest">
                            The future of product management is here
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-[62px] font-black leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto">
                        Your team deserves to know{' '}
                        <span className="primary-gradient-text">what to build next</span>
                        {' '}— not guess.
                    </h1>

                    {/* Subheadline */}
                    <p className="text-[18px] text-[#8B8D97] leading-relaxed max-w-2xl mx-auto mb-4">
                        Spec10x is the AI-native platform that turns raw customer interviews,
                        support tickets, and surveys into prioritized themes, evidence-backed specs,
                        and agent-ready tasks — in minutes, not weeks.
                    </p>
                    <p className="text-[15px] text-[#5A5C66] mb-10">
                        Think Cursor, but for figuring out <em className="text-[#8B8D97] not-italic">what</em> to build — not just how to build it.
                    </p>

                    {/* CTAs */}
                    <div className="flex items-center justify-center gap-4 mb-16">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-[#4F8CFF] hover:brightness-110 text-white text-[15px] font-semibold transition-all shadow-lg shadow-[#4F8CFF]/20"
                        >
                            Get started free
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center gap-2 h-12 px-7 rounded-lg border border-[#2A2C38] hover:border-[#3A3C48] hover:bg-[#161820] text-[#F0F0F3] text-[15px] font-medium transition-all"
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
                            you're still in spreadsheets.
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-xl mx-auto">
                            Modern product teams are drowning in data they can't use — and making
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
                                {/* Stat */}
                                <div className="px-5 pt-5 pb-3 border-b border-[#1E2028]">
                                    <span className="text-[32px] font-black text-[#ffb4ab]">{point.stat}</span>
                                    <span className="text-[12px] text-[#5A5C66] ml-2">{point.statLabel}</span>
                                </div>
                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="text-[15px] font-semibold text-[#F0F0F3] mb-2">{point.title}</h3>
                                    <p className="text-[13px] text-[#8B8D97] leading-relaxed">{point.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Before/after callout */}
                    <div className="grid grid-cols-2 gap-4">
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
                                    'Upload 20 interviews — AI synthesizes in under 5 minutes',
                                    'AI clusters themes across all sources automatically',
                                    'Open the Priority Board — evidence ranks the roadmap for you',
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
                            Spec10x connects every stage of product discovery into a single platform —
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

                    {/* Loop diagram placeholder */}
                    <ScreenshotPlaceholder
                        label="DIAGRAM: A circular flow diagram showing the Discover → Synthesize → Specify → Deliver → Learn loop. Each node is connected by arrows. Below each node is a mini icon and a one-line description. The loop has a subtle blue glow. Dark background. Clean, technical feel — similar to how Vercel or Linear illustrate their architecture."
                        aspect="wide"
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
                        className={`py-20 border-t border-[#1E2028] ${i % 2 === 1 ? 'bg-[#161820]' : ''}`}
                    >
                        <div className="max-w-6xl mx-auto px-6">
                            <div className={`grid grid-cols-2 gap-16 items-center ${!feature.imageRight ? 'direction-rtl' : ''}`}>
                                {/* Text */}
                                <div className={feature.imageRight ? '' : 'order-2'}>
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
                                <div className={feature.imageRight ? '' : 'order-1'}>
                                    <div className="rounded-xl overflow-hidden border border-[#1E2028] shadow-2xl">
                                        <ScreenshotPlaceholder label={feature.screenshot} aspect="video" />
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
                            ingested and returns grounded answers — with inline citations linking
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
                    <div className="rounded-xl overflow-hidden border border-[#1E2028] shadow-2xl">
                        <ScreenshotPlaceholder
                            label="SCREENSHOT: Ask AI page showing a full chat interface. A user question at the top: 'What are the biggest onboarding complaints from enterprise users?' Below, a streaming AI response with 3 key findings. Each finding has [1][2][3] citation badges in blue. On the right side panel: cited sources listed as cards — Interview with Acme Corp (highlighted excerpt), Zendesk ticket #4892 (highlighted excerpt), NPS response (highlighted excerpt). Suggested follow-up questions appear below the response."
                            aspect="video"
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
                                Traditional PRDs are prose designed for humans — they&apos;re useless to
                                AI coding agents. Spec10x generates structured, precise, executable
                                specifications that Cursor, Claude Code, and Devin can actually consume.
                            </p>
                            <p className="text-[15px] text-[#8B8D97] leading-relaxed mb-8">
                                Each task ships with a context bundle: the relevant user quotes,
                                design references, acceptance criteria, and data points — so your
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

                        {/* Screenshot */}
                        <div>
                            <div className="rounded-xl overflow-hidden border border-[#1E2028] shadow-2xl">
                                <ScreenshotPlaceholder
                                    label="SCREENSHOT: Agent-ready task view. A spec titled 'Redesign onboarding flow — step 2 confusion' is broken into 4 atomic tasks. Each task card shows: task title, scope (files/components affected), a 'Context Bundle' section with 2 user quotes and 1 data point, acceptance criteria as a checklist, and an 'Export' button with Cursor, Claude Code, and Linear logos. One task is expanded showing the full context bundle."
                                    aspect="video"
                                />
                            </div>
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
                            shifting — from &ldquo;how do we build it?&rdquo; to &ldquo;what should we build?&rdquo;
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
                                    'What used to take 3 days of manual work takes 5 minutes. Upload, wait, read your insights — then spend the rest of the week on decisions.',
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
                                    'Spec10x tracks theme velocity over time. You\'ll know when something is emerging — before it blows up in your NPS or your churn.',
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
                </div>
            </section>

            {/* ══════════════════════════════════════
                SOCIAL PROOF (placeholder)
            ══════════════════════════════════════ */}
            <section className="py-20 border-t border-[#1E2028] bg-[#161820]">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-[12px] font-semibold text-[#5A5C66] uppercase tracking-widest mb-12">
                        What PMs are saying
                    </p>
                    <div className="grid grid-cols-3 gap-6">
                        {[
                            {
                                quote: 'I used to dread synthesis week. Now I literally run it on my lunch break. The themes it surfaces are better than what I would have found manually.',
                                name: 'Sarah Chen',
                                role: 'Senior PM, Series B SaaS',
                                placeholder: 'AVATAR: Professional headshot, female, mid-30s. Warm lighting.',
                            },
                            {
                                quote: 'We\'re a 3-person team. We have no researcher. Spec10x gives us research superpowers without the headcount. It\'s the first tool that actually understood our problem.',
                                name: 'Marcus Rivera',
                                role: 'Co-founder & Head of Product',
                                placeholder: 'AVATAR: Professional headshot, male, late-20s. Startup casual.',
                            },
                            {
                                quote: 'The Ask AI feature alone saved our last planning cycle. Instead of a 3-hour debate, we pulled up the evidence in 10 minutes and aligned the room.',
                                name: 'Priya Nair',
                                role: 'Director of Product, Enterprise',
                                placeholder: 'AVATAR: Professional headshot, female, early-40s. Corporate but approachable.',
                            },
                        ].map((testimonial) => (
                            <div key={testimonial.name} className="rounded-xl border border-[#1E2028] bg-[#0F1117] p-6 text-left">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className="material-symbols-outlined text-[#FBBF24]" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                </div>
                                <p className="text-[14px] text-[#8B8D97] leading-relaxed mb-5 italic">
                                    &ldquo;{testimonial.quote}&rdquo;
                                </p>
                                <div className="flex items-center gap-3">
                                    {/* Avatar placeholder */}
                                    <div className="w-9 h-9 rounded-full bg-[#1C1E28] border border-[#2A2C38] flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#3A3C48]" style={{ fontSize: 18 }}>person</span>
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-[#F0F0F3]">{testimonial.name}</p>
                                        <p className="text-[12px] text-[#5A5C66]">{testimonial.role}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-[#2A2C38] mt-3 font-mono leading-tight">{testimonial.placeholder}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════
                PRICING
            ══════════════════════════════════════ */}
            <section id="pricing" className="py-24 border-t border-[#1E2028]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <Eyebrow icon="payments" text="Pricing" />
                        <h2 className="text-[40px] font-bold leading-tight mb-4">
                            Less than a team lunch.<br />Worth more than a full-time researcher.
                        </h2>
                        <p className="text-[16px] text-[#8B8D97] max-w-xl mx-auto">
                            Start free. Upgrade when you&apos;re seeing the value — and you will.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {PRICING_TIERS.map((tier) => (
                            <div
                                key={tier.name}
                                className={`rounded-xl border p-7 relative ${
                                    tier.highlight
                                        ? 'border-[#4F8CFF] bg-[#4F8CFF]/5 ring-1 ring-[#4F8CFF]/30'
                                        : 'border-[#1E2028] bg-[#161820]'
                                }`}
                            >
                                {tier.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#4F8CFF] text-[11px] font-bold text-white uppercase tracking-wide">
                                        Most Popular
                                    </div>
                                )}
                                <p className="text-[14px] font-semibold text-[#F0F0F3] mb-1">{tier.name}</p>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-[40px] font-black text-[#F0F0F3]">{tier.price}</span>
                                    <span className="text-[13px] text-[#5A5C66]">{tier.period}</span>
                                </div>
                                <p className="text-[13px] text-[#8B8D97] mb-6">{tier.description}</p>
                                <Link
                                    href="/login"
                                    className={`block w-full h-10 rounded-lg text-[14px] font-semibold transition-all flex items-center justify-center mb-6 ${
                                        tier.highlight
                                            ? 'bg-[#4F8CFF] hover:brightness-110 text-white'
                                            : 'border border-[#2A2C38] hover:border-[#3A3C48] hover:bg-[#1C1E28] text-[#F0F0F3]'
                                    }`}
                                >
                                    {tier.cta}
                                </Link>
                                <ul className="space-y-3">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-[13px] text-[#8B8D97]">
                                            <span className="material-symbols-outlined text-[#34D399] shrink-0 mt-0.5" style={{ fontSize: 15 }}>check</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-[13px] text-[#5A5C66] mt-8">
                        Enterprise team?{' '}
                        <Link href="/login" className="text-[#afc6ff] hover:underline">Talk to us</Link>
                        {' '}for custom pricing, SSO, and dedicated support.
                    </p>
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
                        Stop guessing. Stop debating. Start building the right things — backed by
                        evidence from every customer conversation you&apos;ve ever had.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 h-13 px-8 rounded-lg bg-[#4F8CFF] hover:brightness-110 text-white text-[16px] font-bold transition-all shadow-lg shadow-[#4F8CFF]/25"
                            style={{ height: 52 }}
                        >
                            Start for free — no card required
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
                            <a href="#pricing" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Pricing</a>
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
