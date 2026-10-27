export function loginUrl(redirectTo) {
    if (!redirectTo || redirectTo === '/login')
        return '/login';
    return `/login?redirect=${encodeURIComponent(redirectTo)}`;
}
