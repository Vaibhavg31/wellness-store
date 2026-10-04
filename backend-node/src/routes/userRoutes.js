import { Router } from 'express';
import crypto from 'node:crypto';
import { requireCustomer, requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, sendCsv } from '../lib/response.js';
import { validateAddress, normalizeAddress } from '../lib/addressHelper.js';
import { MAX_ADDRESSES } from '../lib/addressBookHelper.js';
import { sumRevenue } from '../lib/orderRevenue.js';
import { exportTablePdf } from '../lib/exportHelper.js';
import { UserRepository } from '../repositories/userRepository.js';
import { OrderRepository } from '../repositories/orderRepository.js';

const router = Router();
const userRepo = new UserRepository();
const orderRepo = new OrderRepository();

// ── Addresses (customer) ────────────────────────────────────────────────

router.get('/users/addresses', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const user = await userRepo.getById(String(payload.userId));
    if (!user) return sendError(res, 'User not found', 404);
    sendJson(res, user.addresses || []);
}, 'Failed to fetch addresses'));

router.post('/users/addresses', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    const normalized = normalizeAddress(body);
    const errors = validateAddress(normalized);
    if (Object.keys(errors).length > 0) return sendError(res, Object.values(errors).join(' '), 400);

    const userId = String(payload.userId);
    const user = await userRepo.getById(userId);
    if (!user) return sendError(res, 'User not found', 404);

    const addresses = user.addresses || [];
    if (addresses.length >= MAX_ADDRESSES) return sendError(res, `Maximum ${MAX_ADDRESSES} saved addresses allowed`, 400);

    const isFirst = addresses.length === 0;
    const isDefault = isFirst || Boolean(body.isDefault);

    if (isDefault && !isFirst) await userRepo.setDefaultAddressForUser(userId, '');

    const newAddr = await userRepo.addAddress(userId, { ...normalized, isDefault });
    if (isDefault) await userRepo.setDefaultAddressForUser(userId, newAddr.id);
    await userRepo.setLastUsedAddress(userId, newAddr.id);

    sendJson(res, newAddr, 201);
}, 'Failed to save address'));

router.put('/users/addresses/:id', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const body = req.body || {};
    const normalized = normalizeAddress(body);
    const errors = validateAddress(normalized);
    if (Object.keys(errors).length > 0) return sendError(res, Object.values(errors).join(' '), 400);

    const userId = String(payload.userId);
    if (body.isDefault) await userRepo.setDefaultAddressForUser(userId, req.params.id);

    const updated = await userRepo.updateAddressData(userId, req.params.id, { ...normalized, isDefault: Boolean(body.isDefault) });
    if (!updated) return sendError(res, 'Address not found', 404);
    sendJson(res, updated);
}, 'Failed to update address'));

router.delete('/users/addresses/:id', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const userId = String(payload.userId);

    const user = await userRepo.getById(userId);
    if (!user) return sendError(res, 'User not found', 404);

    const removed = await userRepo.removeAddress(userId, req.params.id);
    if (!removed) return sendError(res, 'Address not found', 404);

    if ((user.lastUsedAddressId || '') === req.params.id) {
        const refreshed = await userRepo.getById(userId);
        const remaining = refreshed?.addresses || [];
        await userRepo.setLastUsedAddress(userId, remaining[0]?.id || '');
    }

    sendJson(res, { success: true });
}, 'Failed to delete address'));

router.put('/users/addresses/:id/default', asyncRoute(async (req, res) => {
    const payload = await requireCustomer(req);
    const userId = String(payload.userId);

    const ok = await userRepo.setDefaultAddressForUser(userId, req.params.id);
    if (!ok) return sendError(res, 'Address not found', 404);

    const user = await userRepo.getById(userId);
    sendJson(res, user?.addresses || []);
}, 'Failed to set default address'));

// ── Admin ────────────────────────────────────────────────────────────────

function sanitizeUser(user) {
    const { passwordHash, ...rest } = user;
    return rest;
}

async function enrichUser(user) {
    const userId = String(user.id || '');
    const email = String(user.email || '');
    const stats = await orderRepo.computeStatsForUser(userId, email);
    const orders = await orderRepo.getForUser(userId, email);
    const revenue = sumRevenue(orders);

    return sanitizeUser({
        ...user,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        revenue,
        deliveredCount: stats.deliveredCount,
        lastOrderAt: stats.lastOrderAt,
    });
}

async function guestCustomersFromOrders() {
    const registeredEmails = new Set();
    for (const user of await userRepo.getAll()) {
        const email = String(user.email || '').toLowerCase().trim();
        if (email) registeredEmails.add(email);
    }

    const guests = new Map();
    for (const order of await orderRepo.getAll()) {
        const email = String(order.email || '').toLowerCase().trim();
        if (!email || registeredEmails.has(email)) continue;

        if (!guests.has(email)) {
            const shipping = order.shipping || {};
            guests.set(email, {
                id: `guest-${crypto.createHash('md5').update(email).digest('hex').slice(0, 12)}`,
                email: order.email,
                name: shipping.name || 'Guest customer',
                avatar: null,
                phone: shipping.phone || null,
                phoneVerified: false,
                createdAt: order.createdAt || null,
                lastLogin: null,
                isGuest: true,
                isBlocked: false,
            });
        }
    }

    return Promise.all([...guests.values()].map((g) => enrichUser(g)));
}

function filtersFromQuery(query) {
    return {
        search: query.search || '',
        from: query.from || '',
        to: query.to || '',
        phoneVerified: query.phoneVerified || '',
        blocked: query.blocked || '',
        sort: query.sort || 'createdAt',
        order: query.order || 'desc',
    };
}

function applyBlockedFilter(users, filters) {
    if (filters.blocked === '') return users;
    const wantBlocked = ['1', 'true', 'yes'].includes(String(filters.blocked));
    return users.filter((u) => Boolean(u.isBlocked) === wantBlocked);
}

function sortUsers(users, filters) {
    const sort = filters.sort || 'createdAt';
    const dir = String(filters.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    if (!['orderCount', 'totalSpent', 'createdAt', 'lastLogin'].includes(sort)) return users;

    return [...users].sort((a, b) => {
        let va = a[sort] ?? '';
        let vb = b[sort] ?? '';
        if (sort === 'orderCount' || sort === 'totalSpent') { va = Number(va); vb = Number(vb); }
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * dir;
    });
}

router.get('/users/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const filters = filtersFromQuery(req.query);
    const users = await userRepo.listAdminFiltered(filters);
    let enriched = await Promise.all(users.map((u) => enrichUser(u)));

    if (filters.phoneVerified === '' && filters.from === '' && filters.to === '') {
        enriched = enriched.concat(await guestCustomersFromOrders());
    }

    enriched = applyBlockedFilter(enriched, filters);
    enriched = sortUsers(enriched, filters);

    sendJson(res, enriched);
}, 'Failed to fetch users'));

router.get('/users/admin/export', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const filters = filtersFromQuery(req.query);
    const users = await userRepo.listAdminFiltered(filters);
    let enriched = await Promise.all(users.map((u) => enrichUser(u)));

    if (filters.phoneVerified === '' && filters.from === '' && filters.to === '') {
        enriched = enriched.concat(await guestCustomersFromOrders());
    }

    const format = String(req.query.format || 'csv').toLowerCase();
    if (!['csv', 'pdf'].includes(format)) return sendError(res, 'Invalid export format. Use csv or pdf.', 400);

    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Phone Verified', 'Phone Verified At', 'Joined', 'Last Login',
        'Blocked', 'Order Count', 'Total Spent', 'Revenue', 'Delivered Orders', 'Last Order At', 'Guest'];

    const rows = enriched.map((user) => [
        user.id || '', user.name || '', user.email || '', user.phone || '',
        user.phoneVerified ? 'Yes' : 'No', user.phoneVerifiedAt || '',
        user.createdAt || '', user.lastLogin || '', user.isBlocked ? 'Yes' : 'No',
        String(user.orderCount || 0), String(user.totalSpent || 0), String(user.revenue || 0),
        String(user.deliveredCount || 0), user.lastOrderAt || '', user.isGuest ? 'Yes' : 'No',
    ]);

    const from = filters.from || 'all';
    const to = filters.to || 'all';
    const baseName = `wellness-users-${from}-to-${to}`;

    if (format === 'pdf') return exportTablePdf(res, `${baseName}.pdf`, 'Users Export', headers, rows);
    sendCsv(res, `${baseName}.csv`, headers, rows);
}, 'Failed to export users'));

router.get('/users/admin/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const id = req.params.id;

    if (id.startsWith('guest-')) {
        const guests = await guestCustomersFromOrders();
        const guest = guests.find((g) => g.id === id);
        if (!guest) return sendError(res, 'Guest customer not found', 404);
        const orders = await orderRepo.getForUser('', String(guest.email));
        return sendJson(res, { user: guest, orders });
    }

    const user = await userRepo.getById(id);
    if (!user) return sendError(res, 'User not found', 404);

    const enriched = await enrichUser(user);
    const orders = await orderRepo.getForUser(id, String(user.email || ''));
    sendJson(res, { user: enriched, orders });
}, 'Failed to fetch user'));

router.put('/users/admin/:id/block', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const id = req.params.id;
    if (id.startsWith('guest-')) return sendError(res, 'Guest customers cannot be blocked. Create a block-by-email rule if needed.', 400);

    const user = await userRepo.getById(id);
    if (!user) return sendError(res, 'User not found', 404);

    const blocked = Boolean(req.body?.blocked);
    const updated = await userRepo.setBlocked(id, blocked);
    if (!updated) return sendError(res, 'Failed to update user', 500);

    sendJson(res, await enrichUser(updated));
}, 'Failed to update user'));

router.put('/users/admin/:id/phone', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const id = req.params.id;
    if (id.startsWith('guest-')) return sendError(res, 'Guest customers do not have an account to update.', 400);

    const user = await userRepo.getById(id);
    if (!user) return sendError(res, 'User not found', 404);

    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.length !== 10) return sendError(res, 'Enter a valid 10-digit mobile number', 400);

    const updated = await userRepo.update(id, { phone, phoneVerified: true, phoneVerifiedAt: new Date().toISOString() });
    if (!updated) return sendError(res, 'Failed to update phone number', 500);

    sendJson(res, await enrichUser(updated));
}, 'Failed to update phone number'));

export default router;
