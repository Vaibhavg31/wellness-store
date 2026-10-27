import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
    return (
        <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
            <div className="max-w-md">
                <Logo size="xl" className="mx-auto mb-10" />
                <p className="eyebrow mb-3">404</p>
                <h1>Page not found</h1>
                <p className="mb-10 mt-4 text-muted">The page you&apos;re looking for seems to have wandered off. Let us guide you back.</p>
                <div className="flex justify-center gap-3">
                    <Link to="/"><Button size="lg">Return home</Button></Link>
                    <Link to="/shop"><Button size="lg" variant="outline">Shop</Button></Link>
                </div>
            </div>
        </main>
    );
}
