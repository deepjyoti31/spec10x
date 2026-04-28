import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy — Spec10x',
    description: 'How Spec10x collects, uses, and protects your data.',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0F1117] text-[#F0F0F3]">

            {/* Nav */}
            <nav className="border-b border-[#1E2028] sticky top-0 bg-[#0F1117]/95 backdrop-blur z-10">
                <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x" className="w-6 h-6 object-contain" />
                        <span className="text-[16px] font-bold">Spec10x</span>
                    </Link>
                    <Link href="/terms" className="text-[13px] text-[#8B8D97] hover:text-[#afc6ff] transition-colors">Terms of Service</Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16">

                {/* Header */}
                <div className="mb-12">
                    <p className="text-[12px] font-semibold text-[#afc6ff] uppercase tracking-widest mb-3">Legal</p>
                    <h1 className="text-[36px] font-bold text-[#F0F0F3] mb-4">Privacy Policy</h1>
                    <p className="text-[15px] text-[#8B8D97]">Last updated: April 26, 2026 &nbsp;·&nbsp; Effective date: April 26, 2026</p>
                </div>

                <div className="prose-custom space-y-12">

                    {/* Intro */}
                    <Section>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            Spec10x (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Spec10x platform, a product discovery and research synthesis tool
                            available at spec10x.com (the &quot;Service&quot;). This Privacy Policy explains what information we collect, why we collect it,
                            how we use and share it, and the choices you have regarding your information. It applies to all users of the Service,
                            including visitors to our website, registered account holders, and teams using Spec10x on behalf of an organisation.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            By accessing or using the Service, you agree to the collection and use of information described in this policy. If you
                            do not agree, please do not use the Service.
                        </p>
                    </Section>

                    {/* 1 */}
                    <Section title="1. Information We Collect">
                        <SubSection title="1.1 Information You Provide Directly">
                            <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                                <li><strong className="text-[#F0F0F3]">Account information.</strong> When you register, we collect your name, email address, and password (stored as a hashed credential via Firebase Authentication). If you sign up with Google OAuth, we receive your name, email, and profile picture from Google.</li>
                                <li><strong className="text-[#F0F0F3]">Interview and research content.</strong> Files you upload — including transcript text (.txt, .md, .pdf, .docx), audio (.mp3, .wav), and video (.mp4) — are stored and processed to provide the core features of the Service. This content may contain personal data about your own customers or research participants; you are responsible for ensuring you have appropriate rights and consents to upload it.</li>
                                <li><strong className="text-[#F0F0F3]">Survey data.</strong> NPS or other survey exports (CSV or structured formats) you import into the Service.</li>
                                <li><strong className="text-[#F0F0F3]">Integration credentials and data.</strong> When you connect third-party services such as Zendesk, we receive an API key or OAuth token and fetch support ticket data on your behalf. We only request the minimum permissions necessary.</li>
                                <li><strong className="text-[#F0F0F3]">Payment information.</strong> If you subscribe to a paid plan, payment details (card number, billing address) are collected directly by our payment processor (Stripe). We do not store full card numbers on our servers; we receive and store only a tokenised reference.</li>
                                <li><strong className="text-[#F0F0F3]">Communications.</strong> If you contact us via email or in-app support, we retain those communications to respond to you and improve the Service.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="1.2 Information Collected Automatically">
                            <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                                <li><strong className="text-[#F0F0F3]">Log data.</strong> Our servers automatically record information when you use the Service, including your IP address, browser type and version, operating system, referring URLs, pages visited, features used, and timestamps.</li>
                                <li><strong className="text-[#F0F0F3]">Usage analytics.</strong> We collect anonymised event data (e.g., which features are clicked, how often reports are generated) to understand how the product is used and guide development priorities.</li>
                                <li><strong className="text-[#F0F0F3]">Cookies and similar technologies.</strong> We use session cookies required for authentication, preference cookies to remember your settings, and analytics cookies. See Section 8 for full details.</li>
                                <li><strong className="text-[#F0F0F3]">Device information.</strong> We may collect device identifiers, screen resolution, and timezone to ensure the Service renders correctly and to detect suspicious activity.</li>
                            </ul>
                        </SubSection>

                        <SubSection title="1.3 Information from Third Parties">
                            <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                                <li><strong className="text-[#F0F0F3]">Google OAuth.</strong> If you sign in with Google, we receive basic profile data (name, email, profile picture) from Google in accordance with the OAuth scopes you authorise.</li>
                                <li><strong className="text-[#F0F0F3]">Zendesk.</strong> When you authorise the Zendesk integration, we pull ticket content, metadata (subject, status, priority, requester name and email), and comments into the Service to enable cross-source synthesis.</li>
                                <li><strong className="text-[#F0F0F3]">Linear, Jira, and GitHub.</strong> When you use export features to push specs to these tools, we send generated content to those services. We do not persistently store your credentials for these services beyond the active session unless you choose to save them.</li>
                            </ul>
                        </SubSection>
                    </Section>

                    {/* 2 */}
                    <Section title="2. How We Use Your Information">
                        <p className="text-[15px] text-[#B0B2BA] mb-4">We use information collected for the following purposes:</p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li><strong className="text-[#F0F0F3]">Providing the Service.</strong> Processing uploaded content (transcription, AI-powered theme extraction, quote citation, impact scoring, feature brief generation) and delivering results back to you.</li>
                            <li><strong className="text-[#F0F0F3]">Authentication and account management.</strong> Creating and managing your account, verifying identity, and maintaining session security via Firebase Authentication.</li>
                            <li><strong className="text-[#F0F0F3]">Billing and subscriptions.</strong> Managing subscription plans, processing payments through Stripe, and sending invoices and billing-related notifications.</li>
                            <li><strong className="text-[#F0F0F3]">Communication.</strong> Sending transactional emails (account verification, password resets, usage alerts), product announcements, and, where you have opted in, marketing communications. You may unsubscribe at any time.</li>
                            <li><strong className="text-[#F0F0F3]">Product improvement.</strong> Analysing aggregated, anonymised usage patterns to improve features, fix bugs, and prioritise development work. We do not use the content of your individual interviews to train AI models without your explicit consent.</li>
                            <li><strong className="text-[#F0F0F3]">Security and fraud prevention.</strong> Monitoring for unauthorised access, detecting abuse of the Service, and complying with legal obligations.</li>
                            <li><strong className="text-[#F0F0F3]">Legal compliance.</strong> Fulfilling obligations under applicable law, responding to lawful requests from authorities, and enforcing our Terms of Service.</li>
                        </ul>
                    </Section>

                    {/* 3 */}
                    <Section title="3. AI Processing of Your Content">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            The core value of Spec10x is AI-driven analysis. When you upload files or connect data sources, your content is
                            processed by AI models to extract themes, sentiment, pain points, and feature signals. We use third-party AI providers
                            (including large language model APIs) under data processing agreements that restrict the provider from using your
                            data to train their models.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            <strong className="text-[#F0F0F3]">We do not use your uploaded research content to train Spec10x&apos;s own models</strong> without your explicit written consent.
                            AI-generated outputs (themes, briefs, acceptance criteria) are derived from your inputs and are owned by you, subject
                            to Section 5 below.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            If your uploaded content contains personal data about third parties (such as interview participants), you must ensure
                            you have the necessary consents or legal basis under applicable data protection law (including GDPR and CCPA) to process
                            that data using the Service.
                        </p>
                    </Section>

                    {/* 4 */}
                    <Section title="4. How We Share Your Information">
                        <p className="text-[15px] text-[#B0B2BA] mb-4">We do not sell your personal data. We share information only in the following circumstances:</p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li><strong className="text-[#F0F0F3]">Service providers.</strong> We share data with trusted sub-processors (cloud hosting, AI API providers, payment processors, email delivery services, analytics platforms) solely to operate the Service. Each sub-processor is bound by data processing agreements.</li>
                            <li><strong className="text-[#F0F0F3]">Integrations you authorise.</strong> When you connect Zendesk, Linear, Jira, GitHub, or other tools, data flows to those platforms at your direction.</li>
                            <li><strong className="text-[#F0F0F3]">Organisational accounts.</strong> If you use Spec10x under a team or enterprise plan, your workspace owner and administrators may have access to your activity and content within that workspace.</li>
                            <li><strong className="text-[#F0F0F3]">Legal requirements.</strong> We may disclose information if required by law, court order, or government request, or if we believe disclosure is necessary to protect the safety of any person or prevent fraud.</li>
                            <li><strong className="text-[#F0F0F3]">Business transfers.</strong> In the event of a merger, acquisition, or sale of substantially all assets, your information may be transferred to the successor entity, subject to the same privacy protections.</li>
                            <li><strong className="text-[#F0F0F3]">With your consent.</strong> We may share information for any other purpose disclosed to you at the time of collection with your explicit consent.</li>
                        </ul>
                    </Section>

                    {/* 5 */}
                    <Section title="5. Data Retention">
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li><strong className="text-[#F0F0F3]">Account data.</strong> Retained for as long as your account is active. If you delete your account, we will delete or anonymise your account data within 30 days, except where retention is required by law.</li>
                            <li><strong className="text-[#F0F0F3]">Uploaded content (interviews, audio, video, surveys).</strong> Retained for the duration of your subscription. You may delete individual files at any time via the dashboard. On account deletion, all uploaded content is permanently removed within 30 days.</li>
                            <li><strong className="text-[#F0F0F3]">AI-generated outputs.</strong> Retained alongside the source content. Deleting a source file also deletes associated themes, briefs, and quotes.</li>
                            <li><strong className="text-[#F0F0F3]">Billing records.</strong> Retained for seven years to comply with financial and tax regulations.</li>
                            <li><strong className="text-[#F0F0F3]">Log data.</strong> Retained for 90 days for security and debugging purposes, then deleted or anonymised.</li>
                        </ul>
                    </Section>

                    {/* 6 */}
                    <Section title="6. Your Rights and Choices">
                        <p className="text-[15px] text-[#B0B2BA] mb-4">
                            Depending on your location, you may have the following rights regarding your personal data. To exercise any of them,
                            contact us at <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a>.
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li><strong className="text-[#F0F0F3]">Access.</strong> Request a copy of the personal data we hold about you.</li>
                            <li><strong className="text-[#F0F0F3]">Correction.</strong> Request correction of inaccurate or incomplete data.</li>
                            <li><strong className="text-[#F0F0F3]">Deletion.</strong> Request deletion of your personal data (the &quot;right to be forgotten&quot;), subject to legal retention obligations.</li>
                            <li><strong className="text-[#F0F0F3]">Portability.</strong> Request a machine-readable export of your data.</li>
                            <li><strong className="text-[#F0F0F3]">Restriction and objection.</strong> Request restriction of processing, or object to processing based on legitimate interests.</li>
                            <li><strong className="text-[#F0F0F3]">Withdraw consent.</strong> Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing.</li>
                            <li><strong className="text-[#F0F0F3]">Marketing opt-out.</strong> Unsubscribe from marketing emails at any time using the unsubscribe link in any email or by contacting us directly.</li>
                            <li><strong className="text-[#F0F0F3]">California residents (CCPA).</strong> You have the right to know what personal information is collected, disclosed, or sold; the right to opt out of the sale of personal information (we do not sell personal information); and the right to non-discrimination for exercising your rights.</li>
                        </ul>
                        <p className="text-[15px] text-[#B0B2BA] mt-4">We will respond to verifiable requests within 30 days (or within the timeframe required by applicable law).</p>
                    </Section>

                    {/* 7 */}
                    <Section title="7. Data Security">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            We implement appropriate technical and organisational measures to protect your data against unauthorised access,
                            alteration, disclosure, or destruction. These measures include:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA] mt-4">
                            <li>Encryption in transit using TLS 1.2 or higher for all communications between your browser and our servers.</li>
                            <li>Encryption at rest for uploaded files and database records.</li>
                            <li>Authentication via Firebase, which provides industry-standard OAuth 2.0 and email verification flows.</li>
                            <li>Role-based access controls limiting which employees can access production data.</li>
                            <li>Regular security reviews and dependency audits.</li>
                            <li>Isolated storage per workspace to prevent cross-tenant data leakage.</li>
                        </ul>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            No method of transmission or storage is 100% secure. If you discover a security vulnerability, please report it
                            responsibly to <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a>.
                        </p>
                    </Section>

                    {/* 8 */}
                    <Section title="8. Cookies and Tracking">
                        <p className="text-[15px] text-[#B0B2BA] mb-4">We use the following categories of cookies:</p>
                        <div className="space-y-4">
                            <CookieRow name="Strictly Necessary" description="Session authentication cookies issued by Firebase Authentication. Required for the Service to function. Cannot be disabled." />
                            <CookieRow name="Functional" description="Preference cookies that remember your UI settings (theme, sidebar state, last viewed workspace). May be cleared without losing account data." />
                            <CookieRow name="Analytics" description="Anonymised usage tracking to understand feature adoption. Data is aggregated and never tied to individually identifiable users. You may opt out via your account settings." />
                        </div>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            We do not use advertising or cross-site tracking cookies. You can manage cookie preferences through your browser settings,
                            though disabling strictly necessary cookies will prevent you from logging in.
                        </p>
                    </Section>

                    {/* 9 */}
                    <Section title="9. International Data Transfers">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            Spec10x is operated from servers primarily located in the United States. If you are accessing the Service from the
                            European Economic Area (EEA), United Kingdom, or other jurisdictions with data transfer restrictions, your data may
                            be transferred to and processed in the United States or other countries.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            For transfers from the EEA or UK, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission,
                            or other lawful transfer mechanisms recognised under GDPR. Our sub-processors are required to implement equivalent
                            protections.
                        </p>
                    </Section>

                    {/* 10 */}
                    <Section title="10. Children's Privacy">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            The Service is not directed to individuals under the age of 16. We do not knowingly collect personal data from children.
                            If you believe a child has provided us with personal data without parental consent, contact us at{' '}
                            <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a> and we will
                            delete it promptly.
                        </p>
                    </Section>

                    {/* 11 */}
                    <Section title="11. Third-Party Links and Services">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            The Service may contain links to third-party websites or integrations with external platforms (Zendesk, Linear, Jira,
                            GitHub, Cursor, Claude Code, Devin). This Privacy Policy does not apply to those services. We encourage you to review
                            their privacy policies. We are not responsible for the privacy practices of any third party.
                        </p>
                    </Section>

                    {/* 12 */}
                    <Section title="12. Changes to This Policy">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email
                            (to the address associated with your account) and/or by posting a prominent notice within the Service at least
                            14 days before the changes take effect. Your continued use of the Service after changes take effect constitutes
                            your acceptance of the revised policy.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            We encourage you to review this page periodically. The &quot;Last updated&quot; date at the top of this policy indicates when
                            the most recent revision was made.
                        </p>
                    </Section>

                    {/* 13 */}
                    <Section title="13. Contact Us">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                        </p>
                        <div className="mt-4 p-4 bg-[#161820] border border-[#1E2028] rounded-lg space-y-1 text-[14px] text-[#B0B2BA]">
                            <p><strong className="text-[#F0F0F3]">Spec10x</strong></p>
                            <p>Email: <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a></p>
                        </div>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            If you are located in the EEA and are unsatisfied with our response, you have the right to lodge a complaint with
                            your local data protection supervisory authority.
                        </p>
                    </Section>

                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#1E2028] mt-16">
                <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[13px] text-[#5A5C66]">© 2026 Spec10x. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-[13px] text-[#afc6ff]">Privacy Policy</Link>
                        <Link href="/terms" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Terms of Service</Link>
                        <Link href="/" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Home</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-[#1E2028] pt-10">
            {title && <h2 className="text-[20px] font-bold text-[#F0F0F3] mb-5">{title}</h2>}
            {children}
        </section>
    );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-6 first:mt-0">
            <h3 className="text-[15px] font-semibold text-[#F0F0F3] mb-3">{title}</h3>
            {children}
        </div>
    );
}

function CookieRow({ name, description }: { name: string; description: string }) {
    return (
        <div className="p-4 bg-[#161820] border border-[#1E2028] rounded-lg">
            <p className="text-[13px] font-semibold text-[#F0F0F3] mb-1">{name}</p>
            <p className="text-[13px] text-[#8B8D97]">{description}</p>
        </div>
    );
}
