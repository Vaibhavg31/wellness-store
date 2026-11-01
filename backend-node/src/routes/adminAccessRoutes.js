import { Router } from 'express';
import { requireAdmin, requireSuperAdmin, signToken } from '../lib/auth.js';
import { asyncRoute, sendError, sendJson } from '../lib/response.js';
import {
    accountTokenPayload, changeOwnPassword, createAccount, deleteAccount, isSuperEmail, listAccounts, recentAdminLogins, updateAccount,
} from '../lib/adminAccounts.js';

/**
 * Admin panel → Login & access. Every admin sees who they are signed in as, and an admin account can change its own password.
 * Super admins (the developer logins in the server config) also manage the shop's admin accounts and see the sign-in log.
 */
const router = Router();

/** Who is signed in to the admin panel, and what they may manage. */
router.get('/admin/session', asyncRoute(async (req, res) => {
    const admin = requireAdmin(req);
    const superAdmin = Boolean(admin.super && isSuperEmail(admin.email));
    sendJson(res, {
        email: admin.email ?? null,
        super: superAdmin,
        // 'account' = a login kept in the database (can change its own password); 'server' = set in the server config.
        kind: admin.acct ? 'account' : 'server',
    });
}, 'Could not read your admin session'));

router.put('/admin/session/password', asyncRoute(async (req, res) => {
    const admin = requireAdmin(req);
    if (!admin.acct) return sendError(res, 'This login is set on the server and cannot be changed here.', 400);
    const { currentPassword, newPassword } = req.body || {};
    const account = await changeOwnPassword(admin.acct, currentPassword, newPassword);
    // The change ends older sessions, so hand this one a fresh token and keep the admin signed in here.
    sendJson(res, { ok: true, token: signToken(accountTokenPayload(account)) });
}, 'Could not change the password'));

router.get('/admin/accounts', asyncRoute(async (req, res) => {
    requireSuperAdmin(req);
    sendJson(res, await listAccounts());
}, 'Could not load admin accounts'));

router.post('/admin/accounts', asyncRoute(async (req, res) => {
    requireSuperAdmin(req);
    const { email, name, password } = req.body || {};
    sendJson(res, await createAccount({ email, name, password }), 201);
}, 'Could not add the admin account'));

router.put('/admin/accounts/:id', asyncRoute(async (req, res) => {
    requireSuperAdmin(req);
    const { email, name, password, isActive } = req.body || {};
    sendJson(res, await updateAccount(req.params.id, { email, name, password, isActive }));
}, 'Could not update the admin account'));

router.delete('/admin/accounts/:id', asyncRoute(async (req, res) => {
    requireSuperAdmin(req);
    await deleteAccount(req.params.id);
    sendJson(res, { ok: true });
}, 'Could not remove the admin account'));

router.get('/admin/login-log', asyncRoute(async (req, res) => {
    requireSuperAdmin(req);
    sendJson(res, await recentAdminLogins(req.query.limit));
}, 'Could not load the sign-in log'));

export default router;
