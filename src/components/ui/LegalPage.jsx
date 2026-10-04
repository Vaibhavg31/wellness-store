import PageHeader from '@/components/ui/PageHeader';
import Seo from '@/components/seo/Seo';

/** Shared layout for long-form policy pages: sections = [{ title, body }] where body is a node. */
export default function LegalPage({ title, updated, sections, path, summary }) {
    return (
        <>
            <Seo title={title} description={summary} path={path} />
            <PageHeader title={title} description={updated && `Last updated: ${updated}`} />
            <div className="container-page py-10 lg:py-16">
                <div className="mx-auto max-w-3xl space-y-10">
                    {sections.map((section) => (
                        <section key={section.title}>
                            <h2 className="mb-3 text-h3">{section.title}</h2>
                            <div className="space-y-3 text-muted">{section.body}</div>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}
