import { BRAND_NAME } from '@/constants';

export default function PrivacyPage() {
    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="font-serif text-4xl font-light text-charcoal mb-4">Privacy Policy</h1>
                <p className="text-sm text-soft-brown mb-10">Last updated: August 2026</p>

                <div className="prose prose-sm max-w-none space-y-6 text-soft-brown font-light leading-relaxed">
                    <section>
                        <h2 className="font-serif text-xl text-charcoal mb-3">Information We Collect</h2>
                        <p>
                            When you shop with {BRAND_NAME}, we collect information you provide directly, such as your name,
                            email address, phone number, and shipping address, to process orders and communicate with you.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-serif text-xl text-charcoal mb-3">How We Use Your Information</h2>
                        <p>
                            We use your information to fulfil orders, verify your identity at checkout, send order updates,
                            respond to enquiries, and, with your consent, share news about new collections and offers.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-serif text-xl text-charcoal mb-3">Data Security</h2>
                        <p>
                            We implement appropriate technical and organisational measures to protect your personal data.
                            Payment information is not stored on our servers; cash-on-delivery orders require no card details.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-serif text-xl text-charcoal mb-3">Your Rights</h2>
                        <p>
                            You may request access to, correction of, or deletion of your personal data at any time by
                            contacting us at hello@kriveajewels.com.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-serif text-xl text-charcoal mb-3">Contact</h2>
                        <p>
                            For privacy-related questions, please reach out via our <a href="/contact" className="text-emerald hover:underline">Contact page</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
