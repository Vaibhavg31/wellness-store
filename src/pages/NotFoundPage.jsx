import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
export default function NotFoundPage() {
    return (<div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6 text-center">
      <div className="max-w-md">
        <Logo size="xl" showHover className="mx-auto mb-10"/>
        <p className="text-[10px] tracking-[0.4em] uppercase text-emerald mb-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl font-light text-ink mb-4">
          Page Not Found
        </h1>
        <p className="text-slate font-light leading-relaxed mb-10">
          The page you&apos;re looking for seems to have wandered off.
          Let us guide you back to our collection.
        </p>
        <Link to="/">
          <Button variant="turmeric" size="lg">
            Return Home
          </Button>
        </Link>
      </div>
    </div>);
}
