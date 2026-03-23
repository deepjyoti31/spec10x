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

export default function PrivacyPage() {
    return (
        <LegalPageShell
            eyebrow="Privacy Framework"
            title="Privacy Policy"
            updatedAt="March 23, 2026"
            summary="This policy explains what Spec10x reads, what it stores, how it uses that data to deliver the product, and the boundaries of our current trust promises."
        >
            <Section title="1. Information We Collect">
                <p>
                    We collect account information such as name, email address, and
                    authentication identifiers so you can sign in and use the service.
                </p>
                <p>
                    We collect customer content you choose to upload or connect, including
                    interviews, transcripts, normalized support evidence, survey imports,
                    related metadata, and the links or IDs needed to trace evidence back to
                    its source.
                </p>
                <p>
                    We also collect operational data such as connection status, sync history,
                    usage activity, and error logs so the product remains usable and
                    supportable.
                </p>
            </Section>

            <Section title="2. How We Use Data">
                <p>
                    We use customer content to provide Spec10x features such as analysis,
                    search, evidence feeds, theme clustering, prioritization, and product
                    support.
                </p>
                <p>
                    We use account and operational data to authenticate users, keep
                    integrations running, investigate failures, enforce product limits, and
                    improve reliability.
                </p>
                <p>
                    We do not use customer content to train Spec10x&apos;s own generalized
                    models.
                </p>
            </Section>

            <Section title="3. AI and Model Providers">
                <p>
                    Some product workflows send content to model or infrastructure providers
                    so we can generate transcripts, embeddings, summaries, or answers.
                </p>
                <p>
                    We do not claim stronger provider-side retention guarantees than the
                    active production configuration and vendor terms support. Where a model
                    provider may apply logging, abuse monitoring, caching, or temporary
                    retention, that possibility is part of the processing path.
                </p>
            </Section>

            <Section title="4. Storage, Disconnect, and Delete">
                <p>
                    Spec10x stores the minimum durable copy needed to make the product useful.
                    That can include transcript text where required for analysis, normalized
                    evidence rows, embeddings, source links and IDs, sync cursors, sync
                    status, and metadata needed for evidence views and debugging.
                </p>
                <p>
                    Disconnect means Spec10x stops future syncs for that connection. It does
                    not delete records in the upstream provider.
                </p>
                <p>
                    Imported-data delete means deleting copied data held by Spec10x. It does
                    not delete the upstream provider&apos;s records. Current self-serve controls
                    include connection disconnect in Integrations and account deletion in
                    Settings. Narrower source-scoped copied-data requests may require support
                    handling while the product surface stays lightweight.
                </p>
            </Section>

            <Section title="5. Security and Credentials">
                <p>
                    Provider credentials are not exposed back through normal application
                    responses. Production deployments should back connected-source credentials
                    with secret-reference storage before public rollout.
                </p>
                <p>
                    We use access controls, operational logging, and managed infrastructure
                    services to reduce risk, but no system can guarantee absolute security.
                </p>
            </Section>

            <Section title="6. Subprocessors and Contact">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">
                            Google Cloud Platform and Vertex AI
                        </h3>
                        <p className="text-sm text-slate-400">
                            Hosting, storage, database, queueing, secret management, logging,
                            and model inference.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-white font-semibold mb-2">
                            Firebase Authentication
                        </h3>
                        <p className="text-sm text-slate-400">
                            User authentication and identity management.
                        </p>
                    </div>
                </div>
                <p>
                    If you have questions about this policy or want to request data deletion,
                    contact <a className="text-[#5E6AD2] hover:text-[#7d87df]" href="mailto:hello@spec10x.com">hello@spec10x.com</a>.
                </p>
            </Section>
        </LegalPageShell>
    );
}
