import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/services/api';

const TOKEN_KEY       = 'chikit-auth-token';
const USER_KEY        = 'chikit-auth-user';
const ADMIN_TOKEN_KEY = 'chikit-admin-token';

export const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/chikit-studio';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
        catch { return null; }
    });
    const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));

    const login = useCallback((newToken, userData) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const adminLoginToken = useCallback((newAdminToken) => {
        localStorage.setItem(ADMIN_TOKEN_KEY, newAdminToken);
        setAdminToken(newAdminToken);
    }, []);

    const adminLogout = useCallback(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken(null);
    }, []);

    const updateUser = useCallback((patch) => {
        setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            localStorage.setItem(USER_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const refreshUser = useCallback(async () => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        if (!currentToken) return null;
        try {
            const profile = await api.get('/api/auth/me', currentToken);
            setUser((prev) => {
                const next = { ...prev, ...profile };
                localStorage.setItem(USER_KEY, JSON.stringify(next));
                return next;
            });
            return profile;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            logout();
            adminLogout();
        });
        return () => setUnauthorizedHandler(null);
    }, [logout, adminLogout]);

    useEffect(() => {
        if (token) {
            refreshUser();
        }
    }, [token, refreshUser]);

    /** Google Sign-In — admin emails go straight to studio. */
    const loginWithGoogle = useCallback(async (credential) => {
        const res = await api.post('/api/auth/google', { credential });
        if (res.role === 'admin') {
            adminLoginToken(res.token);
            logout();
        } else {
            adminLogout();
            login(res.token, res.user);
        }
        return res;
    }, [adminLoginToken, adminLogout, login, logout]);

    /** Email + password sign-in. Admin dev-bypass returns role: 'admin'. */
    const loginWithEmail = useCallback(async (email, password, rememberMe = false) => {
        const res = await api.post('/api/auth/login', { email, password, rememberMe });
        if (res.role === 'admin') {
            adminLoginToken(res.token);
            logout();
        } else {
            adminLogout();
            login(res.token, res.user);
        }
        return res;
    }, [adminLoginToken, adminLogout, login, logout]);

    /** Email + password registration — JWT issued only after email verification (or dev skip). */
    const registerWithEmail = useCallback(async (email, password, name, confirmPassword) => {
        const res = await api.post('/api/auth/register', { email, password, name, confirmPassword });
        if (res.pendingVerification) {
            return res;
        }
        adminLogout();
        login(res.token, res.user);
        return res;
    }, [adminLogout, login]);

    /** Resend email verification link (signed-in or by email before sign-in). */
    const resendVerificationEmail = useCallback(async (email) => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        const body = email ? { email } : {};
        return api.post('/api/auth/resend-verification', body, currentToken || undefined);
    }, []);

    /** Studio username + password fallback. */
    const adminLogin = useCallback(async (username, password) => {
        const res = await api.post('/api/auth/admin/login', { username, password });
        adminLoginToken(res.token);
        logout();
        return res;
    }, [adminLoginToken, logout]);

    const value = useMemo(() => ({
        token,
        user,
        isAuthenticated: !!token,
        login,
        logout,
        updateUser,
        refreshUser,
        adminToken,
        isAdmin: !!adminToken,
        adminLogin,
        adminLogout,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resendVerificationEmail,
    }), [
        token,
        user,
        login,
        logout,
        updateUser,
        refreshUser,
        adminToken,
        adminLogin,
        adminLogout,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resendVerificationEmail,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function useAdminAuth() {
    const { adminToken, isAdmin, adminLogin, adminLogout } = useAuth();
    return { adminToken, isAdmin, adminLogin, adminLogout };
}
