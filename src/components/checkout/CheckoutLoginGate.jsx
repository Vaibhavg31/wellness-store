import { Link } from 'react-router-dom';
import { ChevronLeft, Lock, MapPin, CreditCard, Smartphone } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { imageUrl } from '@/services/api';
import Button from '@/components/ui/Button';
import { loginUrl } from '@/utils/authRedirect';
import { formatPrice } from '@/utils/formatPrice';
import CartLinePrice, { isClubLine } from '@/components/cart/CartLinePrice';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import CouponInput from '@/components/checkout/CouponInput';
import ActiveCoupons from '@/components/checkout/ActiveCoupons';
import PriceBreakdown from '@/components/checkout/PriceBreakdown';

const NEXT = [
    { icon: Smartphone, text: 'Verify your mobile number once' },
    { icon: MapPin, text: 'Add or pick your delivery address' },
    { icon: CreditCard, text: 'Pay online or choose cash on delivery' },
];

/**
 * Checkout for someone who is not signed in yet: the whole order summary and price breakdown (items, coupon, delivery, total) are
 * shown exactly as they will be charged, so there are no surprises. Signing in is only needed to place the order, and it brings
 * the shopper straight back here with the bag unchanged.
 */
export default function CheckoutLoginGate() {
    const { items, total } = useCart();
    return (
        <div className="container-page py-8 lg:py-12">
            <Link to="/cart" className="group mb-5 inline-flex items-center gap-2 text-small text-muted hover:text-primary">
                <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to bag
            </Link>

            <div className="mb-6">
                <p className="eyebrow mb-2">Secure checkout</p>
                <h1 className="text-h2">Review your order</h1>
            </div>

            <CheckoutSteps activeIndex={0} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:items-start">
                <aside className="order-1 space-y-6 lg:order-2 lg:col-span-2" aria-label="Order summary">
                    <ActiveCoupons variant="sidebar" />

                    <div className="space-y-5 rounded-lg border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28 lg:p-8">
                        <h2 className="font-sans text-h4">Order summary</h2>

                        <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                            {items.map((item) => (
                                <li key={`${item.product.id}-${item.product.variantId || ''}-${item.product.offerGroup || item.product.offerId || ''}`} className="flex gap-3">
                                    <img src={imageUrl(item.product.images[0])} alt="" width="56" height="64" className="h-16 w-14 shrink-0 rounded-md object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-small text-ink">{item.product.title}</p>
                                        <p className="text-small text-muted">
                                            {item.product.offerKind === 'bogo' ? <span className="font-semibold text-success">Buy {item.quantity / 2} + {item.quantity / 2} FREE</span> : <>Qty: {item.quantity}</>}
                                            {isClubLine(item.product) && <span className="ml-2 text-accent-ink">Chikit Club price</span>}
                                        </p>
                                        <CartLinePrice product={item.product} quantity={item.quantity} align="start" className="mt-0.5 text-small" />
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="space-y-2 border-t border-line pt-4 text-small">
                            <CouponInput compact />
                            <PriceBreakdown totalClassName="text-primary" />
                        </div>
                    </div>
                </aside>

                <div className="order-2 space-y-5 lg:order-1 lg:col-span-3">
                    <section className="rounded-lg border border-line bg-surface p-5 sm:p-8" aria-labelledby="signin-title">
                        <span className="grid size-12 place-items-center rounded-full bg-accent text-primary-deep"><Lock size={22} aria-hidden="true" /></span>
                        <h2 id="signin-title" className="mt-4 text-h3">Sign in to place your order</h2>
                        <p className="mt-2 max-w-md text-body text-muted">
                            Your total is <strong className="text-ink">{formatPrice(total)}</strong>, delivery included. Sign in with Google and you come straight back to this page with your bag as it is.
                        </p>
                        <Link to={loginUrl('/checkout')} className="mt-6 block sm:max-w-xs">
                            <Button size="lg" className="w-full">Sign in &amp; continue</Button>
                        </Link>
                        <p className="mt-5 text-caption font-semibold uppercase tracking-[0.14em] text-accent-ink">What happens next</p>
                        <ul className="mt-3 space-y-2.5">
                            {NEXT.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-3 text-small text-ink">
                                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-tint text-primary"><Icon size={15} aria-hidden="true" /></span>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
