import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { BRAND_NAME } from '@/constants';

const SignOutTransitionContext = createContext(null);

const FADE_IN_MS = 420;
const HOLD_MS = 380;
const FADE_OUT_MS = 320;

function SignOutOverlay({ active }) {
    useEffect(() => {
        if (!active) return undefined;

        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [active]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence mode="wait">
            {active && (
                <motion.div
                    key="sign-out-overlay"
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: FADE_IN_MS / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <motion.div
                        className="absolute inset-0 bg-cream/88 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-forest/5 via-transparent to-turmeric/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -12, scale: 0.98, filter: 'blur(4px)' }}
                        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="relative text-center max-w-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.08, duration: 0.35, ease: 'backOut' }}
                            className="w-16 h-16 rounded-full bg-forest/10 border border-forest/15 flex items-center justify-center mx-auto mb-5"
                        >
                            <motion.div
                                animate={{ x: [0, -2, 2, 0] }}
                                transition={{ duration: 0.55, ease: 'easeInOut' }}
                            >
                                <LogOut size={26} className="text-forest" strokeWidth={1.5} />
                            </motion.div>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12, duration: 0.35 }}
                            className="font-display text-2xl md:text-3xl text-ink mb-2"
                        >
                            Signing you out
                        </motion.p>
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18, duration: 0.35 }}
                            className="text-sm text-slate font-light"
                        >
                            Thanks for visiting {BRAND_NAME}
                        </motion.p>

                        <motion.div
                            className="mt-6 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-forest/30 to-transparent"
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ delay: 0.22, duration: 0.4 }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

export function SignOutTransitionProvider({ children }) {
    const [active, setActive] = useState(false);

    const runSignOutTransition = useCallback(async (action) => {
        if (active) return;

        setActive(true);
        await new Promise((resolve) => {
            window.setTimeout(resolve, FADE_IN_MS + HOLD_MS);
        });

        await action();

        await new Promise((resolve) => {
            window.setTimeout(resolve, FADE_OUT_MS);
        });

        setActive(false);
    }, [active]);

    return (
        <SignOutTransitionContext.Provider value={{ runSignOutTransition, isSigningOut: active }}>
            {children}
            <SignOutOverlay active={active} />
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
