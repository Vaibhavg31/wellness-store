import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { loginUrl } from '@/utils/authRedirect';

/** Shown on account pages to signed-out visitors. */
export default function SignInPrompt({ icon: Icon, title, description, redirect }) {
    return (
        <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
            <span className="mb-5 grid size-16 place-items-center rounded-full bg-primary-tint text-primary"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span>
            <h1 className="text-h2">{title}</h1>
            <p className="mb-6 mt-3 max-w-sm text-muted">{description}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Link to={loginUrl(redirect)}><Button>Sign in</Button></Link>
                <Link to="/shop"><Button variant="outline">Continue shopping</Button></Link>
            </div>
        </div>
    );
}
