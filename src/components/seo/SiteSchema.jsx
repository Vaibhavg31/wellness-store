import { useSiteContent } from '@/contexts/SiteContentContext';
import { SITE_URL } from '@/components/seo/Seo';
import { organizationJsonLd, websiteJsonLd, absoluteUrl } from '@/utils/seoSchema';
import { hasInstagramUrl } from '@/utils/socialLinks';

/** Site-wide Organization + WebSite structured data (enables brand knowledge panel and the sitelinks search box). */
export default function SiteSchema() {
    const { content } = useSiteContent();
    const { brandName, contact, social } = content;
    const sameAs = hasInstagramUrl(social?.instagramUrl) ? [social.instagramUrl.trim()] : [];
    const org = organizationJsonLd({
        siteUrl: SITE_URL,
        name: brandName,
        logoUrl: absoluteUrl(SITE_URL, '/brand/chikit-logo.webp'),
        email: contact?.email,
        phone: contact?.whatsappNumber,
        sameAs,
    });
    const site = websiteJsonLd({ siteUrl: SITE_URL, name: brandName });
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
        </>
    );
}
