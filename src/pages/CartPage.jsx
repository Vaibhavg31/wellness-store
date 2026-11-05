import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Heart, ShoppingBag, Trash2, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PopularPicks from '@/components/shop/PopularPicks';
import PaymentAssurance from '@/components/product/PaymentAssurance';
import QuantityStepper from '@/components/ui/QuantityStepper';
import PageHeader from '@/components/ui/PageHeader';
import CheckoutSteps from '@/components/checkout/CheckoutSteps';
import CartUpsell from '@/components/cart/CartUpsell';
import FreeDeliveryBar from '@/components/cart/FreeDeliveryBar';
import CouponInput from '@/components/checkout/CouponInput';
import ActiveCoupons from '@/components/checkout/ActiveCoupons';
import PriceBreakdown from '@/components/checkout/PriceBreakdown';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import { loginUrl } from '@/utils/authRedirect';
import { humanizeSlug } from '@/utils/products';
import CartLinePrice, { isClubLine } from '@/components/cart/CartLinePrice';

const removeButton = 'grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger-tint hover:text-danger';

function BundleEntry({ entry, onRemove }) {
    const isBox = entry.kind === 'box';
    const groupId = isBox ? entry.group : entry.bundleId;
    const total = entry.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const original = entry.items.reduce((s, i) => s + i.product.originalPrice * i.quantity, 0);
    return (
        <li className="rounded-lg border border-accent bg-surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 font-medium text-ink">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-tint text-accent-ink"><Gift size={16} aria-hidden="true" /></span>
                    <span className="truncate">{isBox ? entry.bundleTitle : `Bundle: ${entry.bundleTitle}`}</span>
                </p>
                <button type="button" onClick={() => onRemove(groupId, entry.bundleTitle, isBox)} className={removeButton} aria-label={`Remove ${isBox ? 'box' : 'bundle'} ${entry.bundleTitle}`}><Trash2 size={16} /></button>
            </div>
            <ul className="space-y-2.5">
                {entry.items.map((item) => (
                    <li key={item.product.id}>
                        <Link to={`/product/${item.product.id}`} className="group flex items-center gap-3">
                            <img src={imageUrl(item.product.images[0])} alt="" width="48" height="48" className="size-12 shrink-0 rounded-md object-cover" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-small text-ink group-hover:text-primary">{item.product.title}</span>
                                <span className="text-caption text-muted">Qty {item.quantity}</span>
                            </span>
                            <span className="text-small text-ink">{formatPrice(item.product.price * item.quantity)}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            <p className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-small text-muted">{isBox ? 'Box price' : 'Bundle price'}</span>
                <span className="flex items-baseline gap-2">
                    {original > total && <span className="text-caption text-muted line-through">{formatPrice(original)}</span>}
                    <span className="font-semibold text-primary">{formatPrice(total)}</span>
                </span>
            </p>
        </li>
    );
}

function LineEntry({ item, onRemove, onQuantity, onMoveToWishlist }) {
    const { product, quantity } = item;
    const variant = { variantId: product.variantId, offerId: product.offerId };
    return (
        <li className="flex gap-3 rounded-lg border border-line bg-surface p-3 min-[340px]:gap-4 min-[340px]:p-4 sm:p-5">
            <Link to={`/product/${product.id}`} className="shrink-0">
                <img src={imageUrl(product.images[0])} alt={product.title} width="96" height="112" className="h-24 w-20 rounded-md object-cover min-[360px]:h-28 min-[360px]:w-24" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <Link to={`/product/${product.id}`}><h3 className="line-clamp-2 font-sans text-body font-medium hover:text-primary">{product.title}</h3></Link>
                        <p className="mt-0.5 text-caption text-muted">{product.variantLabel || humanizeSlug(product.category)}</p>
                        {product.offerTitle && <p className="mt-0.5 text-caption font-medium text-accent-ink">{isClubLine(product) && product.offerGroup ? 'Box priced at your Chikit Club prices' : product.offerTitle}</p>}
                        {isClubLine(product) && !product.offerGroup && <p className="mt-0.5 text-caption font-medium text-accent-ink">Chikit Club price</p>}
                        {product.offerKind === 'bogo' && <p className="mt-1 inline-flex rounded-full bg-success-tint px-2.5 py-0.5 text-caption font-semibold text-success">Buy {quantity / 2} + {quantity / 2} FREE</p>}
                        {!product.offerId && <button type="button" onClick={() => onMoveToWishlist(item)} className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 text-caption font-medium text-muted transition-colors hover:text-primary"><Heart size={13} aria-hidden="true" /> Move to wishlist</button>}
                    </div>
                    <button type="button" onClick={() => onRemove(product.id, product.title, product.variantId, product.offerId)} className={removeButton} aria-label={`Remove ${product.title}`}><Trash2 size={16} /></button>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    {product.offerKind === 'bogo' ? (
                        // Buy 1 Get 1 moves in sets: each step is one paid product plus its free one.
                        <QuantityStepper value={quantity / 2} min={1} max={Math.max(1, Math.floor((typeof product.stock === 'number' ? product.stock : 98) / 2))} onChange={(sets) => onQuantity(product.id, sets * 2, variant)} />
                    ) : (
                        <QuantityStepper value={quantity} min={1} max={typeof product.stock === 'number' ? product.stock : 99} onChange={(q) => onQuantity(product.id, q, variant)} />
                    )}
                    <CartLinePrice product={product} quantity={quantity} className="text-body" />
                </div>
            </div>
        </li>
    );
}

export default function CartPage() {
    const { items, total, updateQuantity, removeFromCart, removeBundleFromCart, removeOfferGroup, syncPrices } = useCart();
    const { addToWishlist } = useWishlist();
    const { isAuthenticated, user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        syncPrices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRemove = (productId, title, variantId, offerId) => {
        removeFromCart(productId, { variantId, offerId });
        showToast(`Removed "${title}" from bag`, 'info');
    };

    const handleMoveToWishlist = (item) => {
        addToWishlist(item.product);
        removeFromCart(item.product.id, { variantId: item.product.variantId, offerId: item.product.offerId });
        showToast(`Moved "${item.product.title}" to your wishlist`, 'success');
    };

    const handleRemoveBundle = (groupId, bundleTitle, isBox) => {
        if (isBox) removeOfferGroup(groupId);
        else removeBundleFromCart(groupId);
        showToast(`Removed ${isBox ? 'box' : 'bundle'} "${bundleTitle}" from bag`, 'info');
    };

    // Bundle lines are grouped under one card (added/removed as a unit) rather than mixed in with plain lines.
    const entries = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const item of items) {
            const { bundleId, offerGroup } = item.product;
            if (offerGroup) {
                if (!seen.has(offerGroup)) {
                    seen.add(offerGroup);
                    list.push({ type: 'bundle', kind: 'box', group: offerGroup, bundleTitle: item.product.offerTitle, items: items.filter((i) => i.product.offerGroup === offerGroup) });
                }
            } else if (!bundleId) {
                list.push({ type: 'single', item });
            } else if (!seen.has(bundleId)) {
                seen.add(bundleId);
                list.push({ type: 'bundle', kind: 'bundle', bundleId, bundleTitle: item.product.bundleTitle, items: items.filter((i) => i.product.bundleId === bundleId) });
            }
        }
        return list;
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="container-page py-16">
                <EmptyState as="h1" icon={ShoppingBag} title="Your bag is empty" description="Browse freely and add items. No sign-in needed until checkout." actionLabel="Explore the shop" actionHref="/shop" />
                <PopularPicks />
            </div>
        );
    }

    return (
        <>
            <PageHeader title="Shopping bag" description={`${items.length} ${items.length === 1 ? 'item' : 'items'} · saved on this device`} />
            <div className="container-page py-8 lg:py-12">
                <CheckoutSteps activeIndex={0} />

                {isAuthenticated ? (
                    <p className="mb-6 flex items-center gap-3 rounded-lg bg-primary-tint px-4 py-3 text-small text-ink">
                        <User size={18} className="shrink-0 text-primary" aria-hidden="true" />
                        <span>Hello, <strong>{user?.name || user?.email}</strong> — your bag is ready for checkout.</span>
                    </p>
                ) : (
                    <div className="mb-6 flex flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center">
                        <p className="text-small text-ink">Shopping as guest. Sign in only when you&apos;re ready to place your order.</p>
                        <Link to={loginUrl('/checkout')}><Button variant="outline" size="sm">Sign in</Button></Link>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
                    <div className="min-w-0 lg:col-span-2">
                    <FreeDeliveryBar className="mb-4" />
                    <ul className="space-y-3">
                        {entries.map((entry) => (
                            entry.type === 'bundle'
                                ? <BundleEntry key={`bundle-${entry.group ?? entry.bundleId}`} entry={entry} onRemove={handleRemoveBundle} />
                                : <LineEntry key={`${entry.item.product.id}::${entry.item.product.variantId ?? ''}::${entry.item.product.offerId ?? ''}`} item={entry.item} onRemove={handleRemove} onQuantity={updateQuantity} onMoveToWishlist={handleMoveToWishlist} />
                        ))}
                    </ul>
                    <CartUpsell />
                    </div>

                    <div className="space-y-5">
                        <ActiveCoupons variant="sidebar" />
                        <div className="space-y-5 rounded-lg border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28">
                            <h2 className="text-h4">Price details</h2>
                            <CouponInput compact />
                            <PriceBreakdown showUpsell={false} />
                            <Link to="/checkout" className="block"><Button size="lg" className="w-full">Proceed to checkout</Button></Link>
                            <PaymentAssurance className="justify-center" />
                            <Link to="/shop" className="flex min-h-11 items-center justify-center text-small text-muted hover:text-primary">Continue shopping</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phone: the total and the checkout button stay in reach above the tab bar while the shopper reads the bag. */}
            <div className="sticky bottom-[var(--tabbar-h,0px)] z-30 border-t border-line bg-surface px-4 py-3 shadow-[0_-10px_28px_rgb(43_15_43/0.12)] lg:hidden">
                <div className="mx-auto flex max-w-2xl items-center gap-4">
                    <div className="min-w-0">
                        <p className="text-caption text-muted">Total</p>
                        <p className="font-display text-h4 leading-tight text-primary">{formatPrice(total)}</p>
                    </div>
                    <Link to="/checkout" className="min-w-0 flex-1"><Button size="lg" className="w-full">Proceed to checkout</Button></Link>
                </div>
            </div>
        </>
    );
}
