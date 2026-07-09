import Link from 'next/link';

export const metadata = {
    title: 'Trust & Security - Spec10x',
    description: 'A plain-English overview of what Spec10x reads, stores, and how disconnect and copied-data deletion work.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-[#1E2028] pt-10">
            <h2 className="text-[20px] font-bold text-[#F0F0F3] mb-5">{title}</h2>
            {children}
        </section>
    );
}

export default function TrustPage() {
    return (
        <div className="min-h-screen bg-[#0F1117] text-[#F0F0F3]">
            <nav className="border-b border-[#1E2028] sticky top-0 bg-[#0F1117]/95 backdrop-blur z-10">
                <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x" className="w-6 h-6 object-contain" />
                        <span className="text-[16px] font-bold">Spec10x</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <Link href="/privacy" className="text-[13px] text-[#8B8D97] hover:text-[#afc6ff] transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-[13px] text-[#8B8D97] hover:text-[#afc6ff] transition-colors">Terms</Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="mb-12">
                    <p className="text-[12px] font-semibold text-[#afc6ff] uppercase tracking-widest mb-3">Trust</p>
                    <h1 className="text-[36px] font-bold text-[#F0F0F3] mb-4">Trust &amp; Security Overview</h1>
                    <p className="text-[15px] text-[#8B8D97]">Last updated: July 9, 2026</p>
                    <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-5">
                        This page explains what Spec10x reads, what it stores, and what happens when you disconnect a source or ask us to delete copied data.
                    </p>
                </div>

                <div className="space-y-12">
                    <Section title="What we read">
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li>Interview files and transcripts you upload for analysis.</li>
                            <li>Meeting transcripts and metadata from connected recorders like Fireflies. We read transcript text only — never audio or video.</li>
                            <li>Support ticket content and metadata from connected systems like Zendesk.</li>
                            <li>Survey and NPS rows you import by CSV.</li>
                            <li>Aggregated weekly event counts from connected analytics tools like PostHog. We read aggregate counts only — never raw events, user profiles, or session recordings.</li>
                        </ul>
                    </Section>

                    <Section title="What we store">
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li>Transcript text and extracted evidence needed to power the product.</li>
                            <li>Normalized signals, theme links, embeddings, and supporting metadata.</li>
                            <li>Sync state such as cursors, run history, counts, and error summaries.</li>
                        </ul>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            We do not describe Spec10x as a zero-storage product. We keep the durable copy needed for evidence views, score explanations, debugging, and ongoing syncs.
                        </p>
                    </Section>

                    <Section title="Permissions">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            Spec10x is an analysis product, not a writeback system. For v0.5 we aim for read-only access where the provider supports it.
                        </p>
                        <div className="mt-4 rounded-lg border border-[#1E2028] bg-[#161820] overflow-hidden">
                            <div className="grid grid-cols-[1.1fr_1fr] text-[12px] font-semibold text-[#F0F0F3] border-b border-[#1E2028]">
                                <div className="px-4 py-3">Source</div>
                                <div className="px-4 py-3">Expected access</div>
                            </div>
                            {[
                                ['Interview uploads', 'Files you upload directly'],
                                ['Fireflies', 'Read-only transcript access via your API key — no audio or video'],
                                ['Zendesk', 'Read-only ticket and metadata access where supported'],
                                ['Survey CSV import', 'Files you choose to import'],
                                ['PostHog', 'Read-only aggregate event counts via your personal API key — no raw events or recordings'],
                            ].map(([source, access]) => (
                                <div key={source} className="grid grid-cols-[1.1fr_1fr] text-[14px] text-[#B0B2BA] border-b border-[#1E2028] last:border-b-0">
                                    <div className="px-4 py-3">{source}</div>
                                    <div className="px-4 py-3">{access}</div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Disconnect and copied-data deletion">
                        <div className="space-y-4 text-[15px] text-[#B0B2BA] leading-relaxed">
                            <p><strong className="text-[#F0F0F3]">Disconnect</strong> stops future syncs for that source. It does not delete records in the upstream provider.</p>
                            <p><strong className="text-[#F0F0F3]">Copied-data deletion</strong> removes Spec10x's stored copy. It does not remove records from the original system you connected.</p>
                            <p>Source-scoped copied-data deletion remains a support-handled path unless the product explicitly shows a self-serve control for it.</p>
                        </div>
                    </Section>

                    <Section title="Credentials and model usage">
                        <div className="space-y-4 text-[15px] text-[#B0B2BA] leading-relaxed">
                            <p>Connection secrets should be handled as secrets in production. In the current product behavior, secrets are not returned in normal application responses.</p>
                            <p>Spec10x does not use your content to train Spec10x-owned generalized models.</p>
                            <p>We keep our language conservative about model-provider retention and do not claim stronger guarantees than the deployed configuration verifies.</p>
                        </div>
                    </Section>

                    <Section title="Questions">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            If you need a security or data-handling clarification, contact us at <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a>.
                        </p>
                    </Section>
                </div>
            </main>

            <footer className="border-t border-[#1E2028] mt-16">
                <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[13px] text-[#5A5C66]">(c) 2026 Spec10x. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/trust" className="text-[13px] text-[#afc6ff]">Trust</Link>
                        <Link href="/privacy" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Terms</Link>
                        <Link href="/" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Home</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
