import { BRAND_NAME } from '@/constants';

export default function TermsPage() {
    return (
        <div className="pb-20 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="font-display text-4xl font-light text-ink mb-4">Terms of Service</h1>
                <p className="text-sm text-muted mb-10">Last updated: August 2026</p>

                <div className="prose prose-sm max-w-none space-y-6 text-muted font-light leading-relaxed">
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Acceptance of Terms</h2>
                        <p>
                            By accessing or using the {BRAND_NAME} website, you agree to be bound by these Terms of Service.
                            If you do not agree, please do not use our services.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Orders &amp; Payment</h2>
                        <p>
                            All orders are subject to availability and confirmation. We accept Cash on Delivery (COD) and online payments via Razorpay (UPI, cards, and net banking).
                            Prices are listed in Indian Rupees (₹) and include applicable taxes unless stated otherwise.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Shipping &amp; Delivery</h2>
                        <p>
                            Delivery times vary by location. Free delivery applies on orders above ₹1,999.
                            A delivery fee of ₹99 applies to orders below this threshold.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Returns &amp; Refunds</h2>
                        <p>
                            We offer a 7-day hassle-free return policy on unworn items in original packaging.
                            To initiate a return, contact our support team with your order number.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Intellectual Property</h2>
                        <p>
                            All content on this website, including images, text, logos, and designs, is the property of
                            {BRAND_NAME} and may not be reproduced without written permission.
                        </p>
                    </section>
                    <section>
                        <h2 className="font-display text-xl text-ink mb-3">Contact</h2>
                        <p>
                            Questions about these terms? Visit our <a href="/contact" className="text-primary hover:underline">Contact page</a>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
