import { Link } from 'react-router-dom';
import CategoryCircles from '@/components/shop/CategoryCircles';
import ShopSectionHeading from '@/components/shop/ShopSectionHeading';

export default function Categories() {
    return (
        <section className="py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 bg-cream">
            <div className="max-w-6xl mx-auto">
                <ShopSectionHeading title="Shop by Category" className="mb-1 sm:mb-2" />
                <p className="text-center text-xs sm:text-sm text-soft-brown mb-4 sm:mb-8 font-light">
                    Find the perfect piece for every moment
                </p>
                <CategoryCircles linkMode />
                <p className="text-center mt-8">
                    <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-wine font-medium hover:text-wine-light transition-colors border border-wine/25 px-5 py-2.5 rounded-sm hover:bg-wine/5"
                    >
                        Explore All Jewellery
                    </Link>
                </p>
            </div>
        </section>
    );
}
