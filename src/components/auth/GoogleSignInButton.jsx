import { useEffect, useRef, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { useIntegrations } from '@/hooks/useIntegrations';

/** Whether "Continue with Google" can be shown: a Google client id is set up and the shop has not switched it off. */
export function useGoogleSignIn() {
    const { googleClientId, googleReady } = useIntegrations();
    const { content } = useSiteContent();
    return { clientId: googleClientId, configured: googleReady, enabled: googleReady && content.services?.googleSignInEnabled !== false };
}

function Inner({ onSignedIn, onError, onBusy, text }) {
    const { loginWithGoogle } = useAuth();
    const box = useRef(null);
    const [width, setWidth] = useState(320);

    useEffect(() => {
        const el = box.current;
        if (!el) return undefined;
        const update = () => setWidth(Math.max(200, Math.min(el.offsetWidth || 320, 400)));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const handle = async (response) => {
        if (!response?.credential) {
            onError?.('Google did not return your sign-in. Please try again.');
            return;
        }
        onBusy?.(true);
        try {
            const res = await loginWithGoogle(response.credential);
            onSignedIn?.(res);
        } catch (err) {
            onError?.(err instanceof Error ? err.message : 'Google sign-in failed');
        } finally {
            onBusy?.(false);
        }
    };

    return (
        <div ref={box} className="flex min-h-11 w-full justify-center" data-google-signin>
            <GoogleLogin
                onSuccess={handle}
                onError={() => onError?.('Google sign-in was cancelled or blocked. If it keeps happening, allow pop-ups and third-party sign-in for this site.')}
                theme="outline"
                size="large"
                text={text}
                shape="pill"
                width={width}
                context="signin"
                ux_mode="popup"
            />
        </div>
    );
}

/**
 * Google's own "Continue with Google" button. Google's script is only loaded where this button is shown. Renders nothing until
 * a Google client id is set up (config.json → GOOGLE_CLIENT_ID) or when the shop switches Google sign-in off in Settings.
 */
export default function GoogleSignInButton({ onSignedIn, onError, onBusy, text = 'continue_with' }) {
    const { clientId, enabled } = useGoogleSignIn();
    if (!enabled) return null;
    return (
        <GoogleOAuthProvider clientId={clientId} key={clientId}>
            <Inner onSignedIn={onSignedIn} onError={onError} onBusy={onBusy} text={text} />
        </GoogleOAuthProvider>
    );
}
