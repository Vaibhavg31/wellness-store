import { Link } from 'react-router-dom';
import { Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/formatPrice';
import { imageUrl } from '@/services/api';
import Button from '@/components/ui/Button';
import { loginUrl } from '@/utils/authRedirect';
export default function CheckoutLoginGate() {
    const { items, total } = useCart();
    return (<div className="pb-20 px-4 sm:px-6 lg:px-8 min-h-screen bg-cream pt-2 sm:pt-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-5">
            <Lock size={28} className="text-emerald"/>
          </div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-emerald mb-2">Almost there</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink mb-3">Sign in to place your order</h1>
          <p className="text-slate font-light max-w-md mx-auto">
            Browse and add items freely. We only ask you to sign in when you&apos;re ready to buy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-cream rounded-2xl p-6 soft-shadow">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={18} className="text-emerald"/>
              <h2 className="font-display text-lg text-ink">Your bag ({items.length})</h2>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {items.slice(0, 4).map((item) => (<div key={item.product.id} className="flex gap-3">
                  <img src={imageUrl(item.product.images[0])} alt="" className="w-12 h-14 object-cover rounded-lg"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink line-clamp-1">{item.product.title}</p>
                    <p className="text-xs text-slate">Qty {item.quantity}</p>
                  </div>
                  <p className="text-sm">{formatPrice(item.product.price * item.quantity)}</p>
                </div>))}
              {items.length > 4 && (<p className="text-xs text-slate">+{items.length - 4} more items</p>)}
            </div>
            <div className="border-t border-border/60 mt-4 pt-4 flex justify-between font-display text-lg">
              <span>Total</span>
              <span className="text-emerald">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="bg-cream rounded-2xl p-6 md:p-8 soft-shadow flex flex-col justify-center">
            <h2 className="font-display text-xl text-ink mb-2">Continue to checkout</h2>
            <p className="text-sm text-slate mb-6">
              Sign in with Google. No phone number needed yet. We verify your mobile only when you place the order.
            </p>
            <Link to={loginUrl('/checkout')} className="block mb-3">
              <Button variant="turmeric" size="lg" className="w-full">
                Sign In & Continue
              </Button>
            </Link>
            <Link to="/cart" className="block text-center text-sm text-slate hover:text-emerald transition-colors">
              ← Back to cart
            </Link>
          </div>
        </div>
      </div>
    </div>);
}
