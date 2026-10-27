import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSignOutTransition } from '@/contexts/SignOutTransitionContext';
import { useToast } from '@/contexts/ToastContext';

const PROTECTED_AFTER_LOGOUT = ['/account', '/checkout'];

export function useCustomerSession() {
    const { logout, user, isAuthenticated } = useAuth();
    const { runSignOutTransition, isSigningOut } = useSignOutTransition();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const welcomeUser = useCallback((name) => {
        const label = (name && String(name).trim()) || user?.name || user?.email?.split('@')[0] || 'there';
        showToast(`Welcome back, ${label}! Your cart & wishlist are ready.`, 'success');
    }, [showToast, user?.name, user?.email]);

    const signOut = useCallback(() => {
        if (isSigningOut) return;

        void runSignOutTransition(async () => {
            logout();
            showToast('Signed out. You can keep shopping. Cart & wishlist stay on this device.', 'info');
            if (PROTECTED_AFTER_LOGOUT.includes(location.pathname)) {
                navigate('/shop', { replace: true });
            }
        });
    }, [isSigningOut, runSignOutTransition, logout, showToast, navigate, location.pathname]);

    return { signOut, welcomeUser, user, isAuthenticated, isSigningOut };
}
