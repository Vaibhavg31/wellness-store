# Client feedback v1: what was asked, what was done

The client's 12 points (Google Doc "Website Feedback v1"), in their order. Everything below is built, tested in a real
browser on desktop and phone, and editable from the admin where the client said they want to change it later.

| # | Client asked | Status | Where to change it |
|---|---|---|---|
| 1 | Background in the logo's beige | Done. Page and section colours are now warm beige (`#F4EBDD`, bands `#EADDC9`). **We could not find a beige in the logo files received** (the PNGs are transparent, the PDF/AI/EPS are plum on white). If the client has an exact beige, change one value: `--color-canvas` in `src/styles/tokens.css`. | tokens.css |
| 2 | Remove the four marked parts | Done: the "Ancient Wisdom" hero section, "Shop by need", the bundles block ("Rituals that work as a set") and the "Wake the gut gently" day-ritual are off on the homepage. They are only switched off, so Website content → Homepage can bring any back. | Website content → Homepage sections |
| 3 | Top ribbon: New Launches, Concern, Offers, Chikit Club Card, WhatsApp Help | Done. Same ribbon on phones (second row + menu). Each item can be renamed or hidden. | Website content → Top navigation bar |
| 3 | Concern: exactly the client's 14, switch on/off and edit | Done: all 14 (Cardiac … Blood Purifier), each with its own page. Switch off, rename, change keywords or add a picture. A product joins a concern by ticking it on the product page (or by matching the keywords). | Website content → Concern menu; product page → Concerns |
| 3a | Pick & Mix any 3 at ₹1499, each product once | Done: `/offers/pick-any-3`. A box bar shows the 3 slots and the price; a product can only be picked once; the server re-checks everything at checkout. A box never costs more than buying the same things one by one (if the 3 chosen items cost less than ₹1499 the shopper pays the lower total). | Offers |
| 3b | Buy 1 Get 1 Free on a list of products | Done: `/offers/buy-1-get-1-free`. Added in pairs; a pair costs the price of one. Starter list is 4 products; the client changes the list. | Offers |
| 3c | Create more offer pages later | Done: Offers → New offer page (Pick & Mix, Buy 1 Get 1, or a plain collection), with dates, banner and products. Each live page appears in the Offers drop-down automatically. | Offers |
| 3 | Chikit Club Card: phone OTP, email OTP, address, DOB, gender | Done: `/club` (3 steps, free to join, gives a card number). Members see lower prices everywhere and are charged them at checkout. **OTP note:** on the live site SMS and email OTP are currently switched off (no MSG91 / Brevo keys yet), so sign-up skips the two code checks. The moment those keys are added they become required automatically, with no code change. | Chikit Club |
| 3 | WhatsApp Help | Done: opens the WhatsApp helpline number from Settings. | Website content → Store details |
| 4 | Trending now | Done under the banner. Built from the products (ingredients first) unless the client writes their own words. | Homepage → Trending now |
| 5 | One straight page, all categories visible, buttons follow the scroll (Oziva style) | Done: New Launches, Bestsellers, then every category, with a sticky button bar that highlights the section on screen and glides when tapped. | Categories + Products |
| 6 | Watch & Shop reels | Done: tall videos with a Buy now each, full-screen player. The 6 videos in it are **generated placeholders**; the client uploads real reels. | Homepage → Watch & Shop |
| 7 | Top and bottom running ribbons (Krishna style) | Done: a running announcement ribbon at the very top and an icon ribbon (free delivery, secure payments, pure herbs …) under the banner. | Homepage → Running ribbon; Rotating announcements |
| 8 | Product page: multiple bottles, hero ingredients with images, FAQ | Done: pack cards show 1/2/3 bottles with ribbons and per-bottle price; "Hero ingredients" with pictures; two-column FAQ. All 10 products have starter content. | Product page in admin |
| 9 | Information banners on each product | Done: uploaded banners per product, or (until then) panels written from the product's own benefits, steps and ingredients. | Product page → Information banners |
| 10 | FAQ and videos under each product | Done (videos sit right under the FAQ). | Product page → Videos |
| 11 | Search shows random products for half words | Fixed. A typed word must start a word in the product, every word must match, small typos still work, best match first, and descriptions only count for whole words. "ry" now finds nothing instead of random products. | n/a |
| 12 | Member price, e.g. ₹100 vs ₹90 | Done: 10% off by default (Chikit Club → Member discount), or a fixed club price per product or per pack, or leave a product out. Signed-in members see and pay it; everyone else sees "₹90 for Club members" with a link to join. | Chikit Club; product page |

## Things the client should know or decide

* **Wording is placeholder.** The product descriptions, FAQs, ingredient lines and how-to-use steps were written as a sensible starting point (no medical claims). They should be replaced with the brand's approved copy.
* **Pictures are illustrations.** Ingredient pictures and concern tiles are drawn icons (the reference sites use photos we cannot reuse). Real photos can be uploaded in the admin and replace them.
* **Sample prices.** The sample catalogue is cheaper than the ₹1499 box price, so some sample boxes do not save money. With real prices this resolves itself.
* **Four concerns have no products yet** (Cardiac, Diabetic, Kidney, Pain Reliever): their pages say "new products are on the way". Switch them off or add products.
* **Offers and the Club price never stack on the same line.** A Pick & Mix or Buy 1 Get 1 line is priced by its offer; a Club member gets the member price on normal lines. Coupons still work on top.

## How it was built (for developers)

* New tables and columns are created by `backend-node/src/lib/migrations.js` at every start (also on the live database), not by hand.
* `scripts/seed-client-v1.mjs <base-url> <admin-email> <admin-password>` applies the new homepage order, the Watch & Shop reels and the starter product content through the admin API, locally or live. Re-running it is safe.
* Pictures and videos: `node scripts/catalog-art/build.mjs ing-aloe-vera reel-1 …` and `node scripts/catalog-art/reels.mjs` (needs ffmpeg).
* Prices are always worked out on the server (`backend-node/src/routes/orderRoutes.js`, `lib/pricing.js`, `lib/club.js`); the bag's `src/utils/pricing.js` only mirrors them for display.

## Round 2 check (2026-11-03)

Every point above was re-checked against the client's Google Doc, the icon PDF (30 distinct icons, all already in `public/brand/icons` and used in the Health Needs menu, the Well range and the concern pages), the logo PNG (beige #FEE1C5) and the first-phase product list.

* **Brand colour sweep:** the Razorpay payment window and the admin colour field still used the old maroon `#5A0009`; both are now the plum `#602460`. The stored (unused) theme accent is the brand beige `#FEE1C5` and the page background is white, matching `tokens.css`.
* **Short category rows:** a category with one or two products now shows a brand-beige "More Chikit favourites are on the way" panel next to the product instead of a lone card with empty space.
* **Chikit Club:** checked end to end on a test account (mobile, email, birthday/gender/address, card number). Until MSG91 / Brevo keys exist the two OTP checks accept the number and email as entered; with keys they become real codes with no code change. Members are listed (and exported as CSV) under Admin → Chikit Club for retargeting; a product's Club price is the "Chikit Club price" switch on its product page.
* **Search:** "ry" finds nothing, "aloe" finds aloe products, typos still match.
