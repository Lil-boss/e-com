# Torun Mart — Session Handoff

Last updated: 21 August 2026 (gap-closing program)

## How to resume in a new session

Tell the new agent:

> Read `SESSION_HANDOFF.md` and `ADMIN_PANEL_PLAN.md` completely, inspect the current workspace, then continue from the requested next task. Do not recreate completed work.

This file restores project context, not hidden model memory. The current codebase remains the source of truth.

## Project

- Workspace: `/home/shaon/Documents/torun-mart`
- Stack: Next.js 16.3.1 App Router, React, TypeScript, Supabase, Lucide icons
- Language/UI: storefront in Bengali, admin panel in English
  - `lib/order-status.ts` ships both label maps: `statusLabel`/`paymentLabel` (Bengali,
    storefront) and `statusLabelEn`/`paymentLabelEn` (admin). `admin-modules.tsx`
    re-exports the English ones under the plain names for every admin consumer.
  - Admin numbers and dates use `en-US`/`en-GB`; the storefront keeps `bn-BD`.
  - Store content the admin edits (product names, category names, homepage section
    copy, company name, tagline, footer) stays Bengali, it is storefront copy.
- Font: Anek Bangla
- Storefront inspiration: `https://torunmart.com/`, redesigned rather than copied
- Main plan: `ADMIN_PANEL_PLAN.md`

## Commands

```bash
npm run dev
npm run typecheck
npm run build
```

The production build currently passes. `next.config.ts` limits build workers to one CPU because the environment previously terminated parallel prerender workers.

## Environment and security

- Supabase variables are stored locally in `.env`; never print or commit their values.
- Template: `.env.example`
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `ADMIN_BOOTSTRAP_EMAIL`
- Bootstrap admin email: `admin@torunmart.com`
- No admin password is stored in this file. Admin passwords remain in Supabase Auth.
- On the bootstrap email's first successful login, `/admin` creates its `super_admin` staff record if missing.
- Default customer/demo phone: `01820361645`
- Default customer OTP: `123456`
- Other customer numbers use Supabase SMS OTP when Supabase is configured.

## Implemented storefront

- Homepage with responsive navigation, hero slider, categories, product cards, seasonal campaign, reviews, footer, and cart drawer.
- Catalogue route: `/products` — search (`?q=`), category filter (`?category=<slug>`)
  and wishlist filter (`?liked=1`). Every homepage/nav/footer "browse" control points here.
- Product-details route: `/product/[slug]`
- Working image gallery and zoom lightbox.
- Working cart quantities, removal, totals, and persistent local storage.
- Checkout page collects delivery information and submits trusted server-side orders.
- Checkout coupon field validates against Supabase before the order is placed.
- Customer account page supports phone OTP login; signed-in customers see their real
  order history and manage saved addresses.
- Shared storefront footer + mobile bottom nav: `components/site-footer.tsx`
- Shared product card: `components/product-card.tsx`
- Wishlist (localStorage, no account needed): `components/wishlist-provider.tsx`
- Shared card mapping and demo fallbacks: `lib/storefront.ts` (`toCardProduct`, `bengali`, `DEMO_*`)
- Shared storefront header: `components/site-header.tsx`
  - Used by homepage and product-details pages.
  - Contains dynamic company logo, search, account, wishlist, cart, category menu, mobile navigation, and tracking link.
- Storefront data API: `app/api/storefront/route.ts` — accepts `?all=1&q=&category=`
  for the catalogue; without `all` it still returns the 8 featured products.
- Product details API: `app/api/products/[slug]/route.ts`
- Printable invoice: `/invoice/[id]` + `app/api/orders/[id]/route.ts`
  - The invoice is in **English** while the storefront is Bengali: it is the
    document couriers, accountants and payment providers handle. Store data
    inside it (address, footer line, product names) prints as entered.
  - Browser print / "Save as PDF"; no PDF library. `@media print` in `invoice.css`
    hides the cart drawer and the print button, and `document.title` becomes
    `Invoice-<order number>` so the saved file is named sensibly.
  - The order UUID is the access token (capability URL, like a Stripe receipt).
    Reached from the checkout success screen, the account order list and the
    admin order modal. There is no guest "order number + phone" lookup form.
- Saved company logo is loaded dynamically on the storefront and admin sidebar.
- Supabase-disabled or unavailable states use polished demo fallback data.

## Implemented admin panel

Routes:

- `/admin`
- `/admin/login`

Main UI:

- `components/admin-dashboard.tsx` — shell, dashboard, orders, products, inventory, content, reports, settings
- `components/admin-modules.tsx` — categories, customers, promotions, reviews, order detail modal
- `app/admin/admin.css`
- `app/admin/modal-fix.css`

Modules present:

- Dashboard
- Orders
- Products
- Inventory
- Categories
- Customers
- Promotions
- Reviews
- Storefront content
- Reports
- Company settings

### Product management

- Working search, status filter, and category filter.
- Working create, edit, and permanent delete.
- Delete requires browser confirmation.
- Multiple product images; first image is the cover.
- Optional commercial fields:
  - UOM and UOM value
  - Discount
  - UPC / Universal Product Code
  - EAN / European Article Number
  - ISBN / International Standard Book Number
  - Manufacturer Part Number
  - VAT inclusive/exclusive/not specified
  - Category
- Fashion variants support color, size, variant SKU, price, and independent stock.
- Each color/size combination is stored in `product_variants.attributes`.
- The variant builder is available when editing too: existing variants load into the
  modal, edits update `product_variants` and `inventory`, new rows are inserted, and
  removed rows are deleted. Stock cannot drop below reserved units, a variant with
  reserved stock cannot be deleted, and stock changes write `inventory_movements` rows.
  The PATCH response returns the fresh variant list so the modal never reopens stale.
  Submitting an empty builder leaves variants untouched (see the `ponytail:` note in
  the products route).

### Orders

- Working search, status filter and date-range filter.
- Order detail modal: items, totals, coupon, customer note, timeline.
- Valid status transitions only; cancelling releases reserved stock, delivering consumes it.
- Payment status, courier/tracking (one `shipments` row per order) and internal notes.

### Categories, promotions, reviews, customers

- Categories: full create/edit/delete, parent, sort order, home visibility. Delete is
  blocked while products still reference the category.
- Promotions: coupon CRUD with type, minimum spend, usage limits, date window, and a
  live used-count.
- Reviews: filter by state, approve/reject, delete.
- Customers: registered profiles merged with guest orders, with order count, lifetime
  spend and last order date.

### Inventory

- Search and low/healthy stock filters.
- Every colour/size variant is listed independently, not just the first variant.
- Displays total, reserved, and sellable stock.
- Stock-adjustment modal requires a reason.
- Cannot set total stock lower than reserved stock.
- Live updates write inventory movements and audit logs.
- API: `app/api/admin/inventory/route.ts`

### Company settings

- Company name
- Tagline
- Address
- Phone and email
- Currency
- Website
- BIN and Mushak
- Facebook page and Instagram profile URLs (drive the storefront footer socials)
- Logo upload with immediate preview
- Footer content
- Saved name, tagline, address, phone, email, website, currency and footer text feed the
  storefront footer, checkout and account pages (`lib/store-settings.ts`).
- Logo files upload to the public `product-media` Supabase bucket under `store/`.
- Clicking the save button (`তথ্য সংরক্ষণ করুন`) persists `logo_url` and other values into public `store_settings.store`.
- API: `app/api/admin/settings/route.ts`

## Supabase

Files:

- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/202608180001_initial_commerce.sql`
- `supabase/migrations/202608180002_product_commercial_fields.sql`
- `supabase/migrations/202608180003_inventory_movement_policy.sql`
- `supabase/migrations/202608200004_gap_fixes.sql` — applied to the live project (verified
  20 August 2026: the three stock functions exist and the coupon/audit/status-event
  policies work).

Schema includes:

- profiles and customer addresses
- staff members and roles
- categories
- products, variants, media
- inventory and inventory movements
- coupons
- orders, items, status history
- payments and shipments
- reviews
- homepage sections
- store settings
- audit logs
- storage buckets and RLS policies

Apply every migration in filename order, then apply `supabase/seed.sql` to a fresh Supabase project.

## Admin APIs

- `app/api/admin/products/route.ts`
- `app/api/admin/orders/route.ts` — GET detail, status transitions, payment status, shipment, internal note
- `app/api/admin/inventory/route.ts`
- `app/api/admin/content/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/categories/route.ts`
- `app/api/admin/coupons/route.ts`
- `app/api/admin/reviews/route.ts`
- `app/api/admin/customers/route.ts`

Every admin route shares one gate: `lib/supabase/admin-auth.ts` (`requireStaff(roles)`).

Public/customer APIs:

- `app/api/storefront/route.ts`
- `app/api/products/[slug]/route.ts`
- `app/api/orders/route.ts` — reserves stock and applies coupons server-side
- `app/api/coupons/route.ts` — checkout-time coupon preview
- `app/api/account/route.ts` — signed-in customer profile and order history
- `app/api/account/addresses/route.ts` — saved address CRUD

## Stock lifecycle

`202608200004_gap_fixes.sql` adds three security-definer functions:

- `reserve_order_stock(order)` — called by the checkout service client; fails the order when a line has no sellable stock.
- `release_order_stock(order)` — called when an order moves to `cancelled`.
- `consume_order_stock(order)` — called when an order moves to `delivered`.

The same migration adds the missing RLS policies for `coupons`, `audit_logs` and
`order_status_events`; before it, every audit-log and status-history insert was
silently rejected and coupons were unreachable for every role.

## Important implementation decisions

- Product deletion is permanent and cascades through related variant/media/inventory records; UI confirmation is mandatory.
- Admin access requires both Supabase authentication and an active `staff_members` record.
- Customer default login is intentionally separate from admin authorization.
- Storefront content reads from Supabase but retains static fallbacks for resilience.
- Uploaded logo URLs are stored in company settings and reused across storefront/admin.
- Existing user files and unrelated workspace changes must be preserved.

## Storefront controls

Every homepage control resolves to a real destination. Deliberate exceptions:

- The newsletter form acknowledges in the browser only; there is no subscriber table.
  See the `ponytail:` note in `app/page.tsx`.
- Footer links with no page behind them (প্রশ্নোত্তর, গোপনীয়তা, শর্তাবলি,
  ডেলিভারি তথ্য, রিটার্ন ও রিফান্ড) were removed rather than left dead. The delivery
  and return figures now render as text from the `delivery` store setting.
- `শর্তাবলি` / `গোপনীয়তা নীতি` in `app/checkout/page.tsx` and `app/account/page.tsx`
  are still `href="#"`; they need real content pages.
- The announcement bar, campaign copy and hero/seasonal headings now read from
  `store_settings.announcement`, `homepage_sections.seasonal` and `homepage_sections.hero`.
  Only title/subtitle are editable in the admin content module; the JSON `content`
  (slides, campaign price/image) still needs direct database edits.

## Dashboard

Today's numbers come from `/api/admin/reports` (full data), not the 50-row slice.
Tiles read "so far today" with **yesterday's actual figure** as the reference —
deliberately no percentage, because a day in progress compared against a complete
one always reads wrong. Reports keeps percentage deltas, where both windows are
complete and reader-chosen.

The right-hand panel is a work queue with server-counted totals: orders awaiting
confirmation, non-COD payments still unpaid, reviews to moderate, and variants at
or below their own low-stock threshold (every variant, not each product's first).
Each row jumps to the module that clears it.

## Reports

`components/admin-reports.tsx` + `app/api/admin/reports/route.ts` + `app/admin/reports.css`.

The API aggregates over the **whole** orders table for the range, not the 50-row
slice the admin page fetches for its tables, and buckets by Dhaka calendar days
server-side. It returns totals, a same-length previous window for deltas, daily
buckets, status/payment/area tallies, top products from `order_items` and coupon
use. Aggregation is in route code (PostgREST has no clean GROUP BY through RLS);
the ceiling is marked in the file.

Charts are hand-built: CSS bars for magnitude, one SVG polyline for the orders
trend, no chart library. Revenue and orders are separate small multiples sharing
one hovered-day state, never a dual axis. Magnitude bars use a single brand hue;
the one categorical pair (payment/area splits) was checked with the dataviz
validator and carries always-visible labels. Status bars use status colours only
where the colour means a state (delivered, cancelled).

## Closed in the 21 August pass

Storefront: variant selection end to end (cart lines are keyed product+variant,
the order route prices from the chosen one) · order-placed notification via
`ORDER_NOTIFY_WEBHOOK_URL` · guest order tracking at `/track` plus claim-by-phone
at login · customer review submission · editable `/page/[slug]` info pages ·
per-product metadata, sitemap.xml and robots.txt · reveal transitions and
catalogue skeletons · newsletter signups reach the webhook.

Admin: product image upload (`/api/admin/media`) and the project's storage host
allowed for `next/image` · order deletion · restock on return · date-scoped
reports with CSV export · hero slide and campaign JSON editing · manual mobile
banking with a live `payments` ledger.

Platform: rate limiting on the public write endpoints (`lib/rate-limit.ts`) ·
checkout no longer invents an order number on a 503 · order pricing extracted to
`lib/order-lines.ts` with tests (30 tests total).

### Still open, needs you

- `NOTUN10` is advertised in the announcement bar but no such coupon exists.
  Create it in Promotions or change the banner text.
- The four info pages ship with marked drafts; replace with real wording.
- `ORDER_NOTIFY_WEBHOOK_URL` is unset, so order and newsletter notices only log.
- `NEXT_PUBLIC_SITE_URL` must be set in production or canonicals point at localhost.
- A real payment gateway needs merchant credentials; the `payments` ledger is the
  seam it plugs into.
- Storefront pages still fetch after hydration. Server-rendering the homepage,
  catalogue and product pages is the remaining structural item.

## Known gaps and suggested next work

- Cart items are keyed by product slug, so the customer never chooses a variant and
  checkout always takes the first active one. Fixing this is a cart data-model change.
- Returned/refunded orders do not restock; only cancel (release) and deliver (consume)
  move inventory. See the `ponytail:` note in `app/api/admin/orders/route.ts`.
- Payments are tracked through `orders.payment_status`; the `payments` ledger table is
  still unused, and no gateway is connected.
- Customers can read reviews but cannot submit them from the storefront yet.
- Storefront content editing has no preview or version history.
- Tests cover coupon evaluation and variant mapping (`lib/*.test.ts`, `npm test`). Auth, order
  pricing, inventory constraints, RLS and the admin APIs need a live Supabase project
  to test meaningfully.
- Configure a real Supabase SMS provider for non-default phone OTP.

## Verification baseline

Before handing off any future change, run:

```bash
npm run typecheck
npm run build
npm test
```

All three passed immediately before this handoff file was last updated.

## Order flow — verified end to end (20 August 2026)

Traced with two live test orders on `TM-DATE-DB-1K` (baseline 42/0):

- cart → checkout → `POST /api/orders`: order row, items, totals, coupon discount
- `reserve_order_stock` on placement (42 → 42/1)
- order appears in the admin list and detail modal with items, totals and timeline
- transitions pending → confirmed → processing → packed → shipped → delivered
- courier/tracking upsert into `shipments`, payment status change, audit log rows
- `consume_order_stock` on delivered (42/1 → 41/0, `sale -1` movement)
- `release_order_stock` on cancelled (41/1 → 41/0, `release` movement)
- stock adjustment modal restored the consumed unit (41 → 42) with a reason

Two labelled test orders remain in the database: `TM-48376740` (delivered,
"TEST ORDER - delete me") and `TM-48547656` (cancelled, "TEST CANCEL - delete me").
The delivered one adds ৳620 to the dashboard revenue tile.

Known gaps found during that pass:

- `NOTUN10` is advertised in the announcement bar but no such coupon exists, so it
  fails at checkout. Create it in admin promotions or change the announcement text.
- `app/checkout/page.tsx` treats a 503 from `/api/orders` as success and invents a
  local order number. Unreachable while Supabase is configured, but it would lose
  orders silently if the environment ever broke.
