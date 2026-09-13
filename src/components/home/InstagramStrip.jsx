import InstagramIcon from '@/components/ui/InstagramIcon';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { hasInstagramUrl } from '@/utils/socialLinks';

export default function InstagramStrip() {
    const { content } = useSiteContent();
    const { social, instagram } = content;
    const profileUrl = social.instagramUrl?.trim();

    if (!hasInstagramUrl(profileUrl)) return null;

    return (
        <section className="border-y border-forest/10 bg-cream/30" aria-label="Follow us on Instagram">
            <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-center sm:text-left hover:bg-cream/50 transition-colors"
            >
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] p-[2px]">
                    <span className="w-full h-full rounded-full bg-cream flex items-center justify-center">
                        <InstagramIcon size={18} className="text-forest" filled />
                    </span>
                </span>
                <span>
                    <span className="block type-eyebrow text-forest/70">
                        {instagram.stripLabel}
                    </span>
                    <span className="block text-sm sm:text-base font-display text-ink">
                        @{social.instagramHandle}
                    </span>
                </span>
            </a>
        </section>
    );
}
