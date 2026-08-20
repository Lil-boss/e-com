# Torun Mart — Session Handoff

Last updated: 20 August 2026

## How to resume in a new session

Tell the new agent:

> Read `SESSION_HANDOFF.md` and `ADMIN_PANEL_PLAN.md` completely, inspect the current workspace, then continue from the requested next task. Do not recreate completed work.

This file restores project context, not hidden model memory. The current codebase remains the source of truth.

## Project

- Workspace: `/home/shaon/Documents/torun-mart`
- Stack: Next.js 16.3.1 App Router, React, TypeScript, Supabase, Lucide icons
- Language/UI: primarily Bengali
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
- Product-details route: `/product/[slug]`
- Working image gallery and zoom lightbox.
- Working cart quantities, removal, totals, and persistent local storage.
- Checkout page collects delivery information and submits trusted server-side orders.
- Checkout coupon field validates against Supabase before the order is placed.
- Customer account page supports phone OTP login; signed-in customers see their real
  order history and manage saved addresses.
- Shared storefront header: `components/site-header.tsx`
  - Used by homepage and product-details pages.
  - Contains dynamic company logo, search, account, wishlist, cart, category menu, mobile navigation, and tracking link.
- Storefront data API: `app/api/storefront/route.ts`
- Product details API: `app/api/products/[slug]/route.ts`
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
- Logo upload with immediate preview
- Footer content
- Saved name, tagline, address, phone, email, website, currency and footer text feed the
  storefront footer, checkout and account pages (`lib/store-settings.ts`).
- Logo files upload to the public `product-media` Supabase bucket under `store/`.
- Clicking `Update Details` persists `logo_url` and other values into public `store_settings.store`.
- API: `app/api/admin/settings/route.ts`

## Supabase

Files:

- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/202608180001_initial_commerce.sql`
- `supabase/migrations/202608180002_product_commercial_fields.sql`
- `supabase/migrations/202608180003_inventory_movement_policy.sql`
- `supabase/migrations/202608200004_gap_fixes.sql` — **not yet applied to the live project**

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

Apply `supabase/migrations/202608200004_gap_fixes.sql` to the Supabase project before
using stock reservation, coupons, audit logging or order status history.
