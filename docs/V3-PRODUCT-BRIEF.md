# Chikit v3: product brief (storefront rebuilt from scratch)

Branch: `redesign/chikit-v3-from-scratch`. Local review first; nothing here goes to master until it is approved.

## What is kept, what is new

| Kept (the engine) | New (everything the shopper sees) |
|---|---|
| Node API, database, admin panel, cart/order/payment logic, pricing rules on the server | Design system (colour, type, spacing, components), header and footer, home, listing pages, product page, bag, offers, Club, wishlist, search |
| Brand: plum `#602460`, beige `#FEE1C5`, the logo (always on beige), the product list and icon sheet | Nothing from the previous look is reused: new fonts (Fraunces + Manrope), new layout, new product card, new price model |

## Scope (from the client's "Website Feedback v1" document, plus later asks)

| # | Requirement | Where in v3 |
|---|---|---|
| 1 | Beige brand background | Ivory/beige page family, header always on `#FEE1C5` |
| 2 | Removals (old hero, bundles block, day ritual, shop-by-need) | Not rebuilt |
| 3 | Top ribbon: New Launches, Health Needs, Offers, Chikit Club, WhatsApp Help | Header nav + mega menu; phone gets a bottom tab bar |
| 3a/b/c | Offers: Pick any N for a price (₹1,499 for 3), Buy 1 Get 1, more offer pages later | Offers hub + builder, all driven by Admin → Offers |
| 3 | Club: free membership, phone + email OTP, address, DOB, gender | Club page (join flow), member prices everywhere |
| 4 | Trending now | Search suggestions + home chips |
| 5 | One page, all categories, sticky category bar (Oziva style) | Home "Shop the range" with sticky bar |
| 6 | Watch & Shop reels | Home reels row with full-screen player |
| 7 | Top and bottom running ribbons | Announcement ribbon + bottom ribbon |
| 8-10 | Product page: packs (1/2/3 bottles), hero ingredients, info banners, FAQ, videos | New product page |
| 11 | Search fix | Same ranked search engine, new search UI |
| 12 | Member prices | New two-state price model (below) |
| later | Icon sheet (30 icons), first-phase product list (13 SKUs), beige logo background | Health-needs row, Well range, brand rules |

## Research: what the leading stores do

* **Kapiva**: a "Select Concern" grid of image tiles right under the banner; product rows per concern; every card shows a discount badge, the sale price and the struck-through MRP; loyalty (Kapiva Coins) is printed on each card and in the top bar.
* **OZiva**: stacked announcement offers, "Build Your Box @₹1,299" as a permanent entry point, a "Cash & Offers" wallet link, a sticky WhatsApp help bar.
* **Marketplaces (Amazon Prime, Flipkart Plus, Myntra Insider)**: membership is explained at the point of price, not only on a separate page; savings are phrased in rupees ("save ₹50"), not abstractly.
* **Mobile commerce research (Baymard)**: most sites have mediocre product-page and navigation UX; a visible Shop path, thumbnails for extra images and no horizontal tabs for the main product sections are the recurring fixes.

## Design principles

1. **Brand first**: plum and beige carry the whole page. White is only for cards that hold a product.
2. **One idea per section**; strong rhythm between ivory, white, beige and deep plum bands.
3. **App-like on a phone**: bottom tab bar, bottom sheets instead of pop-ups, thumb-sized targets, a sticky buy bar.
4. **Price clarity**: the shopper always knows what they pay, what they save and how to get the lower price.

## Chikit Club: pricing model

Joining is free today; the model is built so points and tiers can be added later without redesign.

* **Guest** sees: `₹499` `₹999` `50% off`, and under it a beige "Club price ₹449, join free" line. Tapping it opens a bottom sheet (what you get, one button) so nobody has to leave the product.
* **Member** sees the Club price as the main price (plum, with a gold crown label), the regular price struck through, and "You save ₹550" in green. The guest nudge disappears.
* **Header**: guest has a "Join Club" button; a member has a gold-crowned "Club" chip.
* **Bag**: member sees "Club savings ₹X"; a guest sees "Join the Club and save ₹X on this bag" with a one-tap join.
* Offers (Pick & Mix, Buy 1 Get 1) never stack with the Club price on the same line (server rule, unchanged).
* The admin keeps the per-product Club switch, fixed Club price per product or pack, and the member list.

## Colour system

| Role | Value |
|---|---|
| Plum (brand) | `#602460`, deep `#38123A`, night `#240A26` |
| Beige (brand) | `#FEE1C5`, light `#FFF1E0`, ivory page `#FFFAF3` |
| Ink / muted | `#261029` / `#6A5668` |
| Club gold (crown only) | `#B7852D`, soft `#F3DDA8` |
| Savings green | `#2A6B45` on `#E4F2E9` |
| Herbal sage (rare accent) | `#587457` |

Type: Fraunces (display, soft serif) and Manrope (body).
