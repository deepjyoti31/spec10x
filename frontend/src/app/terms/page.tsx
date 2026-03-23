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

export default function TermsPage() {
    return (
        <LegalPageShell
            eyebrow="Service Terms"
            title="Terms of Service"
            updatedAt="March 23, 2026"
            summary="These terms govern access to Spec10x, including customer responsibilities for uploaded and connected data, the limits of AI-generated output, and how disconnect and deletion work."
        >
            <Section title="1. Use of the Service">
                <p>
                    These Terms of Service form an agreement between you and VertiTech Inc
                    for access to and use of the Spec10x platform.
                </p>
                <p>
                    You may use the service only if you have authority to upload content or
                    connect the systems you authorize Spec10x to read.
                </p>
            </Section>

            <Section title="2. Customer Data and Permissions">
                <p>
                    You retain ownership of customer content you upload or connect. You grant
                    Spec10x a limited right to store, transform, analyze, and display that
                    content only as needed to provide the service.
                </p>
                <p>
                    Spec10x is an analysis product. For the current product surface, we ask
                    for read-oriented access where possible and do not position the service
                    as a writeback system.
                </p>
                <p>
                    Disconnect stops future syncs in Spec10x. It does not delete provider
                    records outside Spec10x.
                </p>
            </Section>

            <Section title="3. AI Output and Product Decisions">
                <p>
                    Spec10x uses AI systems to generate transcripts, themes, summaries,
                    answers, and prioritization signals. These outputs are assistive and may
                    be incomplete, outdated, or incorrect.
                </p>
                <p>
                    You are responsible for reviewing AI-generated output before using it for
                    product, engineering, legal, or commercial decisions.
                </p>
            </Section>

            <Section title="4. Deletion and Termination">
                <p>
                    You may stop using the service at any time. Current self-serve controls
                    include connection disconnect in Integrations and account deletion in
                    Settings. Some source-scoped copied-data requests may require support
                    handling while the product surface remains lightweight.
                </p>
                <p>
                    Deleting copied data from Spec10x does not delete upstream provider data.
                    You remain responsible for revoking or rotating provider credentials on
                    the upstream system when needed.
                </p>
            </Section>

            <Section title="5. Acceptable Use">
                <p>
                    You may not use the service to violate laws, infringe third-party rights,
                    probe or bypass security controls, or upload content you are not
                    authorized to process.
                </p>
                <p>
                    You may not use automated means to extract or mirror the service beyond
                    the product and API behavior we intentionally provide.
                </p>
            </Section>

            <Section title="6. Warranty Disclaimer and Liability">
                <p>
                    The service is provided on an as-is and as-available basis. To the
                    maximum extent permitted by law, VertiTech Inc disclaims warranties not
                    expressly stated in these terms.
                </p>
                <p>
                    To the maximum extent permitted by law, VertiTech Inc is not liable for
                    indirect, incidental, special, consequential, or punitive damages arising
                    from use of the service.
                </p>
            </Section>

            <Section title="7. Governing Law and Contact">
                <p>
                    These terms are governed by the laws of Delaware, United States, unless
                    applicable law requires otherwise.
                </p>
                <p>
                    Questions about these terms can be sent to{' '}
                    <a className="text-[#5E6AD2] hover:text-[#7d87df]" href="mailto:hello@spec10x.com">
                        hello@spec10x.com
                    </a>.
                </p>
            </Section>
        </LegalPageShell>
    );
}
