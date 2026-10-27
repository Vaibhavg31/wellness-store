import { createContext, useCallback, useContext, useState } from 'react';

const SignOutTransitionContext = createContext(null);

/** Tracks an in-flight sign-out so UI can disable repeat clicks. */
export function SignOutTransitionProvider({ children }) {
    const [active, setActive] = useState(false);

    const runSignOutTransition = useCallback(async (action) => {
        if (active) return;
        setActive(true);
        try {
            await action();
        } finally {
            setActive(false);
        }
    }, [active]);

    return (
        <SignOutTransitionContext.Provider value={{ runSignOutTransition, isSigningOut: active }}>
            {children}
        </SignOutTransitionContext.Provider>
    );
}

export function useSignOutTransition() {
    const ctx = useContext(SignOutTransitionContext);
    if (!ctx) {
        throw new Error('useSignOutTransition must be used within SignOutTransitionProvider');
    }
    return ctx;
}
