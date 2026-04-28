import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service — Spec10x',
    description: 'The terms and conditions governing your use of Spec10x.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0F1117] text-[#F0F0F3]">

            {/* Nav */}
            <nav className="border-b border-[#1E2028] sticky top-0 bg-[#0F1117]/95 backdrop-blur z-10">
                <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/assets/logos/spec10x_logo_transparent_1080.png" alt="Spec10x" className="w-6 h-6 object-contain" />
                        <span className="text-[16px] font-bold">Spec10x</span>
                    </Link>
                    <Link href="/privacy" className="text-[13px] text-[#8B8D97] hover:text-[#afc6ff] transition-colors">Privacy Policy</Link>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-16">

                {/* Header */}
                <div className="mb-12">
                    <p className="text-[12px] font-semibold text-[#afc6ff] uppercase tracking-widest mb-3">Legal</p>
                    <h1 className="text-[36px] font-bold text-[#F0F0F3] mb-4">Terms of Service</h1>
                    <p className="text-[15px] text-[#8B8D97]">Last updated: April 26, 2026 &nbsp;·&nbsp; Effective date: April 26, 2026</p>
                </div>

                <div className="space-y-12">

                    {/* Intro */}
                    <Section>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            Please read these Terms of Service (&quot;Terms&quot;) carefully before using the Spec10x platform (&quot;Service&quot;) operated by
                            Spec10x (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). These Terms govern your access to and use of the Service, including any content,
                            features, and functionality offered through spec10x.com.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            By creating an account or using the Service in any way, you agree to be bound by these Terms. If you are using
                            the Service on behalf of an organisation, you represent that you have authority to bind that organisation to
                            these Terms, and references to &quot;you&quot; include that organisation.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            If you do not agree to these Terms, do not access or use the Service.
                        </p>
                    </Section>

                    {/* 1 */}
                    <Section title="1. Description of the Service">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            Spec10x is a product discovery and research synthesis platform that helps product managers and teams:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA] mt-4">
                            <li>Upload, transcribe, and analyse customer interview recordings, transcripts, and documents.</li>
                            <li>Import and synthesise support tickets from Zendesk and survey responses.</li>
                            <li>Use AI to extract themes, pain points, feature requests, and insights across all sources, with evidence trails to original quotes.</li>
                            <li>Generate product specifications, feature briefs, acceptance criteria, and user stories grounded in research evidence.</li>
                            <li>Export structured outputs to tools such as Linear, Jira, GitHub Issues, Cursor, Claude Code, and Devin.</li>
                        </ul>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.
                        </p>
                    </Section>

                    {/* 2 */}
                    <Section title="2. Accounts and Registration">
                        <SubSection title="2.1 Account Creation">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                To use the Service, you must register for an account by providing a valid email address and password, or by
                                authenticating via Google OAuth. You agree to provide accurate, current, and complete information and to keep
                                your account information up to date.
                            </p>
                        </SubSection>
                        <SubSection title="2.2 Email Verification">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Accounts registered with email and password require email verification before you can sign in. You must click
                                the verification link sent to your registered email address. We are not responsible for delays or failures in
                                email delivery.
                            </p>
                        </SubSection>
                        <SubSection title="2.3 Account Security">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You are responsible for maintaining the confidentiality of your account credentials and for all activity that
                                occurs under your account. You agree to notify us immediately at{' '}
                                <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a> if
                                you suspect unauthorised access to your account. We are not liable for any loss or damage arising from your
                                failure to protect your credentials.
                            </p>
                        </SubSection>
                        <SubSection title="2.4 One Account Per Person">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Each individual may maintain only one personal account. Team functionality is available via workspace plans.
                                Creating duplicate accounts to circumvent usage limits is prohibited.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 3 */}
                    <Section title="3. Acceptable Use">
                        <p className="text-[15px] text-[#B0B2BA] mb-4">You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:</p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li>Use the Service to upload, process, or distribute content that is illegal, defamatory, obscene, or that infringes any third-party intellectual property rights.</li>
                            <li>Upload personal data about third parties (such as interview participants) without having the appropriate legal basis or consent to process that data.</li>
                            <li>Attempt to reverse-engineer, decompile, or extract the source code of the Service or its underlying AI models.</li>
                            <li>Circumvent, disable, or interfere with security features or access controls.</li>
                            <li>Use automated tools, bots, or scripts to scrape, crawl, or extract data from the Service in a manner that places unreasonable load on our infrastructure.</li>
                            <li>Resell, sublicense, or otherwise commercialise access to the Service without our prior written consent.</li>
                            <li>Impersonate another person or entity, or misrepresent your affiliation with any person or entity.</li>
                            <li>Upload malware, viruses, or any other harmful code.</li>
                            <li>Use the Service to conduct competitive analysis or build a competing product without our written consent.</li>
                            <li>Violate any applicable local, national, or international law or regulation.</li>
                        </ul>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            We reserve the right to suspend or terminate accounts that violate these prohibitions and to report illegal activity
                            to the appropriate authorities.
                        </p>
                    </Section>

                    {/* 4 */}
                    <Section title="4. Your Content">
                        <SubSection title="4.1 Ownership">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You retain all ownership rights to the content you upload to the Service (&quot;Your Content&quot;), including interview
                                transcripts, audio files, video files, survey data, and support ticket data imported via integrations. Nothing in
                                these Terms transfers ownership of Your Content to us.
                            </p>
                        </SubSection>
                        <SubSection title="4.2 Licence to Us">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                By uploading Your Content, you grant us a limited, non-exclusive, royalty-free, worldwide licence to store,
                                process, and transmit Your Content solely as necessary to provide the Service to you. This licence terminates
                                when you delete the content or close your account.
                            </p>
                        </SubSection>
                        <SubSection title="4.3 AI-Generated Outputs">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Insights, themes, feature briefs, acceptance criteria, user stories, and other outputs generated by the Service
                                based on Your Content (&quot;Outputs&quot;) are yours to use, modify, publish, and commercialise freely. We claim no
                                ownership in Outputs. You acknowledge that AI-generated content may contain inaccuracies, and you are responsible
                                for reviewing Outputs before acting on them.
                            </p>
                        </SubSection>
                        <SubSection title="4.4 Your Responsibilities">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You are solely responsible for Your Content and its legality. You represent and warrant that you own or have the
                                necessary rights to upload Your Content, and that doing so does not violate the rights of any third party or any
                                applicable law. If Your Content includes personal data about interview participants, you are responsible for
                                obtaining the appropriate consents and disclosures required under applicable data protection law.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 5 */}
                    <Section title="5. Intellectual Property">
                        <SubSection title="5.1 Our Intellectual Property">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                The Service, including its software, design, AI models, algorithms, trademarks, logos, and all related
                                technology, is and remains the exclusive property of Spec10x and its licensors. These Terms do not grant you
                                any right, title, or interest in the Service beyond the limited licence to use it as described herein.
                            </p>
                        </SubSection>
                        <SubSection title="5.2 Feedback">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                If you provide us with suggestions, feedback, or ideas regarding the Service (&quot;Feedback&quot;), you grant us a
                                perpetual, irrevocable, royalty-free, worldwide licence to use, incorporate, and commercialise that Feedback
                                without any obligation to compensate you. You waive any moral rights in Feedback to the extent permitted by law.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 6 */}
                    <Section title="6. Subscriptions, Billing, and Payments">
                        <SubSection title="6.1 Plans and Pricing">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Spec10x offers free and paid subscription plans. Paid plan features, pricing, and usage limits are described on
                                the pricing page and may be updated from time to time. Continued use of a paid plan after a price change
                                constitutes acceptance of the new price.
                            </p>
                        </SubSection>
                        <SubSection title="6.2 Billing">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Paid subscriptions are billed in advance on a monthly or annual basis through Stripe. By providing payment
                                information, you authorise us to charge the applicable fees to your payment method on each renewal date. All
                                prices are in USD unless stated otherwise.
                            </p>
                        </SubSection>
                        <SubSection title="6.3 Free Trials">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                We may offer free trials of paid features. Unless you cancel before the trial ends, your payment method will
                                be charged at the start of the next billing period.
                            </p>
                        </SubSection>
                        <SubSection title="6.4 Refunds">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                All fees are non-refundable except where required by applicable law or as explicitly stated in a written
                                agreement with us. If you believe you have been charged in error, contact us within 30 days of the charge
                                at <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a>.
                            </p>
                        </SubSection>
                        <SubSection title="6.5 Taxes">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Prices exclude applicable taxes (VAT, GST, sales tax, etc.) unless stated otherwise. You are responsible for
                                paying all taxes applicable to your use of the Service in your jurisdiction.
                            </p>
                        </SubSection>
                        <SubSection title="6.6 Downgrades and Cancellations">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end
                                of the current billing period; you retain access to paid features until then. Downgrading may result in reduced
                                storage or feature access and potential data deletion as described in the data retention policy.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 7 */}
                    <Section title="7. Third-Party Integrations">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            The Service integrates with third-party platforms including Zendesk, Linear, Jira, GitHub, Google OAuth, Stripe,
                            Cursor, Claude Code, and Devin. Your use of those integrations is governed by the respective third party&apos;s terms
                            and privacy policy. We are not responsible for the functionality, availability, or practices of any third-party
                            service.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            When you authorise an integration, you grant us the ability to access and transmit data on your behalf to that
                            service. You may revoke integration access at any time from your account settings or from the third-party
                            service&apos;s authorisation dashboard.
                        </p>
                    </Section>

                    {/* 8 */}
                    <Section title="8. Confidentiality">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            We treat Your Content as confidential and will not access or disclose it except: (a) as necessary to provide the
                            Service; (b) as required by law or court order; (c) with your explicit consent; or (d) as described in our
                            Privacy Policy. Our employees and contractors who may access Your Content are subject to confidentiality obligations.
                        </p>
                    </Section>

                    {/* 9 */}
                    <Section title="9. Disclaimer of Warranties">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
                            BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
                            WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            AI-GENERATED OUTPUTS ARE PROVIDED FOR INFORMATIONAL PURPOSES ONLY. WE MAKE NO WARRANTY REGARDING THE ACCURACY,
                            COMPLETENESS, OR RELIABILITY OF ANY OUTPUTS. YOU ARE SOLELY RESPONSIBLE FOR EVALUATING AND ACTING ON OUTPUTS.
                        </p>
                    </Section>

                    {/* 10 */}
                    <Section title="10. Limitation of Liability">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, SPEC10X AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND
                            LICENSORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
                            BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, OR BUSINESS INTERRUPTION, ARISING OUT OF OR
                            IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            IN NO EVENT WILL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE
                            EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS
                            ($100).
                        </p>
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed mt-4">
                            Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so the above
                            exclusions may not apply to you.
                        </p>
                    </Section>

                    {/* 11 */}
                    <Section title="11. Indemnification">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            You agree to indemnify, defend, and hold harmless Spec10x and its officers, directors, employees, and agents from
                            and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:
                            (a) your use of the Service; (b) Your Content; (c) your violation of these Terms; or (d) your violation of any
                            third-party rights, including intellectual property or privacy rights.
                        </p>
                    </Section>

                    {/* 12 */}
                    <Section title="12. Termination">
                        <SubSection title="12.1 By You">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You may terminate your account at any time by going to Account Settings and selecting &quot;Delete Account&quot;, or by
                                contacting us at <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a>.
                                Upon termination, your right to use the Service ceases immediately and your data will be deleted as described
                                in our Privacy Policy.
                            </p>
                        </SubSection>
                        <SubSection title="12.2 By Us">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                We may suspend or terminate your account at any time, with or without notice, if we believe you have violated
                                these Terms, if your use poses a security or legal risk, or if required by law. In the case of termination for
                                convenience (not for cause), we will provide at least 30 days&apos; notice and a pro-rated refund for any prepaid
                                subscription fees.
                            </p>
                        </SubSection>
                        <SubSection title="12.3 Effect of Termination">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Sections 4.2 (Licence to Us), 5 (Intellectual Property), 9 (Disclaimer), 10 (Limitation of Liability), 11
                                (Indemnification), 14 (Dispute Resolution), and 15 (General) survive termination.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 13 */}
                    <Section title="13. Modifications to Terms">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            We may revise these Terms at any time. When we make material changes, we will notify you by email and/or in-app
                            notification at least 14 days before the new Terms take effect. If you continue to use the Service after that
                            date, you are bound by the revised Terms. If you do not agree, you must stop using the Service and may close
                            your account before the effective date.
                        </p>
                    </Section>

                    {/* 14 */}
                    <Section title="14. Dispute Resolution">
                        <SubSection title="14.1 Informal Resolution">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                Before filing any formal claim, you agree to attempt to resolve the dispute informally by contacting us at{' '}
                                <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a> and
                                giving us 30 days to respond.
                            </p>
                        </SubSection>
                        <SubSection title="14.2 Governing Law">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States,
                                without regard to its conflict of law provisions.
                            </p>
                        </SubSection>
                        <SubSection title="14.3 Jurisdiction">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                You agree that any dispute arising from these Terms or the Service will be resolved exclusively in the state or
                                federal courts located in Delaware, and you consent to the personal jurisdiction of those courts. If you are
                                located in the EU or UK, you may also have the right to bring a claim before your local courts under applicable
                                consumer protection laws.
                            </p>
                        </SubSection>
                        <SubSection title="14.4 Class Action Waiver">
                            <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                                TO THE EXTENT PERMITTED BY LAW, YOU WAIVE ANY RIGHT TO BRING CLAIMS AS A PLAINTIFF OR CLASS MEMBER IN ANY
                                CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION.
                            </p>
                        </SubSection>
                    </Section>

                    {/* 15 */}
                    <Section title="15. General Provisions">
                        <ul className="list-disc list-outside pl-5 space-y-2 text-[15px] text-[#B0B2BA]">
                            <li><strong className="text-[#F0F0F3]">Entire Agreement.</strong> These Terms, together with the Privacy Policy and any additional terms applicable to specific features or enterprise plans, constitute the entire agreement between you and Spec10x regarding the Service.</li>
                            <li><strong className="text-[#F0F0F3]">Severability.</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
                            <li><strong className="text-[#F0F0F3]">Waiver.</strong> Our failure to enforce any right or provision of these Terms will not constitute a waiver of that right or provision.</li>
                            <li><strong className="text-[#F0F0F3]">Assignment.</strong> You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations freely, including in connection with a merger or acquisition.</li>
                            <li><strong className="text-[#F0F0F3]">Force Majeure.</strong> We will not be liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including natural disasters, government actions, internet outages, or third-party service failures.</li>
                            <li><strong className="text-[#F0F0F3]">Headings.</strong> Section headings are for convenience only and do not affect the interpretation of these Terms.</li>
                            <li><strong className="text-[#F0F0F3]">Language.</strong> These Terms are written in English. If translated, the English version controls in the event of any conflict.</li>
                        </ul>
                    </Section>

                    {/* 16 */}
                    <Section title="16. Contact Us">
                        <p className="text-[15px] text-[#B0B2BA] leading-relaxed">
                            If you have questions about these Terms, please contact us:
                        </p>
                        <div className="mt-4 p-4 bg-[#161820] border border-[#1E2028] rounded-lg space-y-1 text-[14px] text-[#B0B2BA]">
                            <p><strong className="text-[#F0F0F3]">Spec10x</strong></p>
                            <p>Email: <a href="mailto:hello@spec10x.com" className="text-[#afc6ff] hover:underline">hello@spec10x.com</a></p>
                        </div>
                    </Section>

                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#1E2028] mt-16">
                <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[13px] text-[#5A5C66]">© 2026 Spec10x. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="text-[13px] text-[#5A5C66] hover:text-[#8B8D97] transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-[13px] text-[#afc6ff]">Terms of Service</Link>
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
