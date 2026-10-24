# Chikit storefront: UX & product audit

Date: 24 Oct 2026 · Branch: `redesign/experience-overhaul` · Written for: the owner

How this was done: I loaded the live site (desktop 1440px and phone 390px), scrolled the homepage, shop and product pages screen by screen, read the code behind every homepage section, and compared against published ecommerce research (Baymard Institute) and the homepages of Kapiva (Ayurveda D2C) and Puma India. External claims are linked in [Sources](#sources). Anything marked *(observed)* is something I saw on our own site, not something I read.

---

## 1. The verdict in one paragraph

The site is clean and trustworthy, but it **feels flat because every section is the same shape**: a small gold eyebrow, a centred serif heading, then a grid of white cards on cream. Nothing changes pace, so the eye has no reason to keep scrolling. On top of that the homepage is **13,900px tall on desktop** *(observed)*, and about **a fifth of it is six category "shelves" that each hold one or two products** next to a dashed "See all" box. With a 10-product catalogue, the page promises abundance and delivers empty rows.

## 2. Why scrolling feels boring (findings)

| # | Finding *(observed)* | Why it hurts |
|---|---|---|
| H1 | Two heroes stacked: the promo slider, then the orbit hero. | First screen has no single message; the orbit (our best asset) starts below the fold. |
| H2 | Six category shelves, each 1–2 products + dashed "See all" tile, each ~650px tall. | Repetitive, mostly empty space, repeats products already shown in "Trending". Biggest offender. |
| H3 | "Trending now" and the shelves show the same products. | Looks like padding. |
| H4 | Trust is stated four times: hero badges, trust strip, "Ayurveda You Can Trust" cards, certified banner. | Repetition reads as filler, not proof. |
| H5 | Reviews: 2 cards in a 3-column grid, third slot empty. No average rating or count. | Looks unfinished; weakest possible social proof. |
| H6 | Every block = eyebrow + H2 + card grid. Only the "daily ritual" scroll story and the quiz break the pattern. | The two best sections are the only memorable ones. |
| H7 | Four floating things at once on phones: offer pill + its close button, WhatsApp, back-to-top. The same WELCOME10 code appears in the announcement bar, the pill, the popup and the newsletter. | Clutter and nagging. |
| H8 | Header category row overflows at 1440px (arrow button, "Pers…" cut off). | Looks broken on the most common laptop size. |

## 3. Other findings across the site

| # | Area | Finding | Severity |
|---|---|---|---|
| P1 | Product card | Big dead gap between title and rating (a fixed 2-line title height even for one-line titles); rating and price on separate rows. | Medium |
| P2 | Product page | On desktop the left column is empty while the right column scrolls (gallery is not sticky), so half the screen is blank for most of the page. | High |
| P3 | Product page | Trust tiles: 4 items in a 3-column grid leave an orphan. Gallery shows two stacked badges (our own rule is one). | Low |
| P4 | Product page | Gallery frame is square but the pack shots are portrait, so a lighter rectangle floats inside a darker tile. | Medium |
| P5 | Search | Opens empty apart from category chips. Typing gives a plain list. No popular products, no concerns. | Medium |
| P6 | Reviews | Review summary (average, star breakdown) is absent on the homepage. | Medium |
| P7 | Catalogue | 7 categories for 10 products. Category pages and the nav bar are therefore thin. This is a merchandising issue, not a design one. | Info |

Already good (kept): sticky mobile buy bar, free-delivery progress and best-coupon nudge in the bag, pincode check, pack-size picker with per-day price, offers list, accessible skip link, reduced-motion support.

## 4. What the research and the market say

- **Baymard (2025 benchmark):** 58% of desktop and 67% of mobile sites have mediocre-to-poor homepage and category navigation. Navigation should follow how people shop (need, occasion), not how stock is organised. Auto-rotating carousels cause unintended detours on mobile; 46% of homepage carousels have usability problems.
- **Kapiva** (closest competitor): sells by **health concern** (Sugar, Gym, Energy, Heart, Skin & Hair…) as a tile grid right under the hero, then one product rail, then the footer. Short and need-led, with pincode check and a loyalty hook.
- **Puma India:** the page alternates **full-bleed campaign blocks, product carousels, dual-column editorial and a dense grid**. Four different shapes in one scroll is exactly what we lack.
- **Checkout (Baymard):** ~70% of carts are abandoned; top reasons are extra costs (39%), slow delivery (21%), security (19%), forced account creation (19%). Our checkout requires sign-in (a login gate), so this is the biggest *conversion* risk after the homepage. Flagged below as a later phase, not changed in this pass.
- **Mobile product pages (Baymard):** a sticky add-to-cart is worth keeping (we have it); rating and count should sit directly above the price.
- **Search autocomplete (Baymard):** only 19% of sites get all the details right; suggestions should guide the query, not just list matches.

Limits of this research: I could read Kapiva and Puma as text, not see them, and I did not study Amazon, Flipkart or the car brands in depth. Car sites (BMW, Audi) are useful for one idea only: **pace**. They alternate a single big image, a single sentence, and a single action per screen. That is the model for our scroll story, not their layouts.

## 5. Decisions (what stays, what goes, what is new)

**Remove**
- Six category shelves (`CategoryShelves`) from the homepage, with their header scroll-spy. Replaced by one filterable range rail.
- Hero trust badges, and the separate `ConcernShelf`/`CategoryGrid` pair. One need-led block replaces both.
- Back-to-top on phones. Offer pill is delayed and no longer stacks on the bottom row on phones.

**New homepage rhythm (each block has its own shape, background and interaction)**
1. **Hero**: orbit, one message, one CTA. The promo slider moves lower as a full-bleed campaign band.
2. **Trust strip**: slim, one line, once.
3. **Shop by need**: a *bento grid* (one large tile, smaller ones) of concerns.
4. **Our range**: one product rail with filter chips (All · Bestsellers · New · by category). Replaces trending, featured and the shelves.
5. **Daily ritual**: kept as is (the standout scroll story).
6. **Campaign band**: full-bleed promo slider.
7. **Bundles**: one large featured kit + two stacked (asymmetric), not three equal cards.
8. **Quiz**: kept.
9. **Our promise**: split layout (image + numbered list), replaces the four-card grid and the certified banner.
10. **Voices**: rating summary + a scrolling row of reviews that adapts to however many exist.
11. **Newsletter**.

**Fix across the site:** product card density, sticky desktop gallery, gallery frame, one badge, trust-tile grid, richer empty search, header nav at 1440px.

**Later (needs your decision, not done here):** guest checkout, subscriptions ("subscribe & save" is standard for supplements), more products per category, real photography, a UPI-first payment layout.

## 6. Plan, in order

1. Homepage restructure (items above) + section order saved to the database and `database/chikit.sql`.
2. Product card + product page fixes.
3. Search, header nav, floating widgets.
4. Visual QA on desktop and phone after each step; one commit per step.

## Sources

- [Baymard: Homepage & category navigation research](https://baymard.com/research/homepage-and-category-usability)
- [Baymard: Homepage carousels](https://baymard.com/research-articles/homepage-carousel)
- [Baymard: Current state of checkout UX](https://baymard.com/research-articles/current-state-of-checkout-ux)
- [Baymard: Autocomplete design](https://baymard.com/research-articles/autocomplete-design)
- [Baymard: Mobile product page benchmark](https://www.baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-page)
- [Kapiva homepage](https://kapiva.in), [Puma India homepage](https://in.puma.com/in/en) (read as text)
- Cart-abandonment reasons are as quoted in the search summary of Baymard's checkout research; I did not open the paywalled benchmark itself.
