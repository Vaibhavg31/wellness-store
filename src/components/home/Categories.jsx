import { Link } from 'react-router-dom';
import CategoryCircles from '@/components/shop/CategoryCircles';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';

export default function Categories() {
    return (
        <section className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-cream">
            <div className="max-w-6xl mx-auto">
                <ShopSectionHeading title="Browse the Store" className="mb-1 sm:mb-2" />
                <p className="text-center text-xs sm:text-sm text-slate mb-4 sm:mb-8 font-light">
                    Find what your body needs, by goal or by category
                </p>
                <CategoryCircles linkMode />
                <p className="text-center mt-8">
                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-forest font-medium hover:text-forest-light transition-colors border border-forest/25 px-5 py-2.5 rounded-sm hover:bg-forest/5"
                    >
                        Shop All Products
                    </Link>
                </p>
            </div>
        </section>
    );
}
