'use client';

import React from 'react';
import LegalPageShell from '@/components/legal/LegalPageShell';

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="glass p-8 rounded-[28px] border border-white/5 space-y-5">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <div className="space-y-4 text-slate-400 leading-relaxed text-sm md:text-base">
                {children}
            </div>
        </section>
    );
}

export default function TrustPage() {
    return (
        <LegalPageShell
            eyebrow="Trust Package"
            title="Security and Trust Overview"
            updatedAt="March 23, 2026"
            summary="This page is the plain-English trust package for Sprint 6: what Spec10x reads, what it stores, how disconnect works, how copied-data deletion works, and which subprocessors are in the current stack."
        >
            <Section title="1. Permissions at a Glance">
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">Interview Uploads</h3>
                        <p className="text-sm text-slate-400">
                            You upload files directly. Spec10x reads the content required to
                            transcribe, analyze, and answer questions over your interviews.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">Support Connectors</h3>
                        <p className="text-sm text-slate-400">
                            For current support integrations, Spec10x is positioned as a
                            read-oriented analysis layer rather than a writeback tool.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">Survey Imports</h3>
                        <p className="text-sm text-slate-400">
                            CSV survey imports are explicit uploads. Imported rows become
                            normalized evidence inside Spec10x.
                        </p>
                    </div>
                </div>
            </Section>

            <Section title="2. What We Store and Why">
                <p>
                    Spec10x stores the minimum durable copy needed to keep the product
                    useful and reviewable. Depending on the workflow, that can include:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>transcript text where it is required for analysis or Q&amp;A</li>
                    <li>normalized evidence rows for feed, themes, and prioritization</li>
                    <li>embeddings for search and retrieval</li>
                    <li>source links, source IDs, and native entity references</li>
                    <li>sync cursors, sync status, and operational metadata for debugging</li>
                </ul>
                <p>
                    We do not position Sprint 6 as a zero-retention or store-everything
                    product. The goal is a useful but bounded durable copy.
                </p>
            </Section>

            <Section title="3. Credentials and Connection Behavior">
                <p>
                    Provider credentials are not exposed back through normal application
                    responses. Production deployments should back connected-source credentials
                    with secret-reference storage before public rollout.
                </p>
                <p>
                    Disconnect means Spec10x stops future syncs for that connection and clears
                    the stored connection secret value used by that connection. Disconnect
                    does not delete records in the upstream provider.
                </p>
            </Section>

            <Section title="4. Imported-Data Delete Behavior">
                <p>
                    Imported-data delete means deleting Spec10x&apos;s copied data, not the
                    provider&apos;s records. That distinction is intentional and should be read
                    literally.
                </p>
                <p>
                    Current self-serve controls include disconnect in Integrations and account
                    deletion in Settings. If you need narrower source-scoped cleanup, contact
                    us and we will handle it through support while the source-management
                    surface stays lightweight.
                </p>
            </Section>

            <Section title="5. Model Data Language">
                <p>
                    Spec10x does not use customer content to train Spec10x&apos;s own generalized
                    models.
                </p>
                <p>
                    Some product features rely on model providers and managed cloud services.
                    We do not claim stronger provider-side retention, logging, caching, or
                    abuse-monitoring guarantees than the active production configuration and
                    provider terms support.
                </p>
            </Section>

            <Section title="6. Storage and Retention Summary">
                <p>
                    Spec10x keeps copied data for as long as it is needed to operate the
                    workspace until that data is deleted through product controls or handled
                    through a support request. Disconnect alone does not remove historical
                    copied data.
                </p>
                <p>
                    The reason copied data exists at all is so feeds, source-aware themes,
                    prioritization, and grounded evidence review remain fast and stable
                    without depending on live provider fetches for every screen load.
                </p>
            </Section>

            <Section title="7. Current Subprocessors">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">
                            Google Cloud Platform and Vertex AI
                        </h3>
                        <p className="text-sm text-slate-400">
                            Cloud Run, Cloud SQL, Cloud Storage, Memorystore, Secret Manager,
                            operational logging, and model inference.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">
                            Firebase Authentication
                        </h3>
                        <p className="text-sm text-slate-400">
                            Account authentication and identity management.
                        </p>
                    </div>
                </div>
            </Section>

            <Section title="8. Contact">
                <p>
                    Questions about trust, permissions, storage, or deletion can be sent to{' '}
                    <a className="text-[#5E6AD2] hover:text-[#7d87df]" href="mailto:hello@spec10x.com">
                        hello@spec10x.com
                    </a>.
                </p>
            </Section>
        </LegalPageShell>
    );
}
