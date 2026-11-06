import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { asyncRoute, sendJson, sendError, HttpError } from '../lib/response.js';
import { assertText, assertDateRange } from '../lib/validate.js';
import { OfferRepository, OFFER_KINDS } from '../repositories/offerRepository.js';

const router = Router();
const repo = new OfferRepository();

function validate(body, { creating }) {
    if (creating || 'title' in body) {
        if (!String(body.title ?? '').trim()) throw new HttpError('Give the offer page a title', 400);
    }
    if (creating || 'kind' in body) {
        if (!OFFER_KINDS.includes(body.kind)) throw new HttpError('Choose what kind of offer this is', 400);
    }
    if ('title' in body) assertText(body.title, 'Title', 255, { required: true });
    if ('startsAt' in body || 'endsAt' in body) assertDateRange(body.startsAt, body.endsAt, { startLabel: 'Start date', endLabel: 'End date' });
    const kind = body.kind;
    if (kind === 'mix_match' && (creating || 'price' in body)) {
        if (!(Number(body.price) > 0)) throw new HttpError('A "pick any" offer needs the price for the whole box', 400);
    }
    if (kind === 'bogo' && (creating || 'productIds' in body) && !(body.productIds ?? []).length) {
        throw new HttpError('Add at least one product to a "buy 1 get 1" offer', 400);
    }
}

// What shoppers see: only offers that are switched on and inside their dates.
router.get('/offers', asyncRoute(async (req, res) => {
    sendJson(res, await repo.getLive(), 200, 30);
}, 'Failed to fetch offers'));

router.get('/offers/admin/all', asyncRoute(async (req, res) => {
    requireAdmin(req);
    sendJson(res, await repo.getAllAdmin());
}, 'Failed to fetch offers'));

router.get('/offers/:slug', asyncRoute(async (req, res) => {
    const offer = await repo.getBySlug(req.params.slug);
    if (!offer || !(await repo.getByIdLive(offer.id))) return sendError(res, 'Offer not found', 404);
    sendJson(res, offer, 200, 30);
}, 'Failed to fetch offer'));

router.post('/offers', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    validate(body, { creating: true });
    sendJson(res, await repo.createOffer(body), 201);
}, 'Failed to create offer'));

router.put('/offers/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    const body = req.body || {};
    validate(body, { creating: false });
    const updated = await repo.updateOffer(req.params.id, body);
    if (!updated) return sendError(res, 'Offer not found', 404);
    sendJson(res, updated);
}, 'Failed to update offer'));

router.delete('/offers/:id', asyncRoute(async (req, res) => {
    requireAdmin(req);
    if (!(await repo.deleteOffer(req.params.id))) return sendError(res, 'Offer not found', 404);
    sendJson(res, { success: true });
}, 'Failed to delete offer'));

export default router;
