# Torun Mart Admin Panel & Supabase Backend Plan

**Status:** Foundation implemented — live Supabase provisioning pending  
**Prepared:** 18 August 2026  
**Frontend:** Next.js 16 App Router  
**Backend platform:** Supabase — Postgres, Auth, Storage, Realtime, Edge Functions

### Implementation snapshot — 18 August 2026

- Responsive admin shell and dashboard navigation implemented.
- Commerce schema, RLS and storage policies, triggers, indexes, and seed data implemented.
- Staff authentication guards and role checks implemented.
- Product, order, content, storefront, product-detail, and checkout APIs implemented.
- Storefront categories, products, hero slides, reviews, product details, checkout, and phone OTP connected to Supabase with demo fallbacks.
- Deployment remaining: apply migration and seed, configure production keys and SMS provider, create the first staff user, and run the operational acceptance checklist.

## 1. Objective

Build a secure, efficient administration system for managing the complete Torun Mart commerce operation: products, inventory, orders, customers, promotions, content, reviews, delivery settings, and staff access.

Supabase will replace the current browser-only prototype data with a durable backend and will become the single source of truth for both the storefront and admin panel.

### Primary outcomes

- Staff can process an order from placement to delivery without editing the database directly.
- Product, price, stock, category, image, and campaign changes appear consistently in the storefront.
- Customers can authenticate using a Bangladesh mobile number and OTP.
- Every privileged action is protected by server-side authorization and Row Level Security.
- Important administrative changes are traceable through an immutable audit log.
- The architecture remains manageable for a small team and can scale without an early platform rewrite.

## 2. Recommended Architecture

```text
Customer storefront ─┐
                     ├─ Next.js App Router ─ Supabase Auth
Admin panel ─────────┘          │           ├─ Postgres + RLS
                               │           ├─ Storage
                               │           └─ Realtime
                               │
                               ├─ Server Actions / Route Handlers
                               └─ Edge Functions / Webhooks
                                           │
                                           ├─ SMS provider
                                           ├─ Payment gateway
                                           └─ Courier service
```

### Supabase client strategy

- Install `@supabase/supabase-js` and `@supabase/ssr`.
- Use cookie-based sessions through `@supabase/ssr` for Next.js server and client rendering.
- Create separate browser and server client utilities.
- Use the publishable key in the browser only.
- Keep the secret/service-role key server-only and use it only for narrowly scoped trusted operations.
- Verify the authenticated user and admin role on the server for every admin mutation.
- Never treat a hidden navigation link or client-side role check as authorization.

## 3. Authentication and Authorization

### Customer authentication

The existing phone-first UI will be connected to Supabase Phone Auth:

1. Normalize Bangladesh numbers from `01XXXXXXXXX` to `+8801XXXXXXXXX`.
2. Request OTP with `supabase.auth.signInWithOtp({ phone })`.
3. Verify the code with `verifyOtp` using the `sms` type.
4. Create or update the customer profile after successful verification.
5. Store the session in secure cookies through the SSR integration.

Supabase Phone Auth currently requires a supported SMS provider such as Twilio, MessageBird, or Vonage. Provider cost, Bangladesh delivery reliability, sender registration, rate limits, and regulatory requirements must be confirmed before production.

### Staff authentication

- Initial recommendation: email/password for staff plus mandatory TOTP MFA.
- Do not use the customer phone-login screen for administrators.
- Disable public staff registration.
- Staff accounts are invited or promoted only by a `super_admin`.
- Require recent authentication for destructive or security-sensitive operations.

### Roles

| Role | Intended access |
| --- | --- |
| `super_admin` | Full system, roles, settings, integrations, audit log |
| `admin` | Products, inventory, orders, customers, promotions, reports |
| `order_manager` | Orders, payments, couriers, customer contact |
| `catalog_manager` | Products, categories, media, inventory, campaigns |
| `support_agent` | Customer/order read access, notes, approved status actions |
| `viewer` | Read-only dashboards and reports |

Roles should live in a protected `staff_members` table, not editable user metadata. A database function such as `is_staff(required_roles text[])` should centralize policy checks.

## 4. Admin Information Architecture

### Primary navigation

- Dashboard
- Orders
- Products
- Inventory
- Categories
- Customers
- Promotions
- Reviews
- Content
- Reports
- Settings

### Secondary utilities

- Global search
- Notifications
- Quick create
- Storefront preview
- Staff account
- Audit log, restricted by role

### Proposed routes

```text
/admin
/admin/orders
/admin/orders/[id]
/admin/products
/admin/products/new
/admin/products/[id]
/admin/inventory
/admin/categories
/admin/customers
/admin/customers/[id]
/admin/promotions
/admin/reviews
/admin/content/homepage
/admin/reports
/admin/settings/store
/admin/settings/delivery
/admin/settings/payments
/admin/settings/staff
/admin/audit-log
```

Use a protected `/admin` route group with server-side session and role checks in the shared layout.

## 5. Admin Modules

### Dashboard

Show operational information rather than decorative metrics:

- Revenue today, this week, and this month
- New, confirmed, processing, shipped, delivered, cancelled, and returned orders
- Orders requiring action
- Low-stock and out-of-stock products
- Payment failures or unverified payments
- Top products and categories
- Recent customer activity
- Storefront health and integration warnings

Every metric must link to its filtered source list.

### Orders

#### Order list

- Search by order number, phone, customer, or tracking number
- Filter by status, payment, courier, location, channel, and date
- Sort by newest, oldest, value, or priority
- Bulk assign courier, export, print, or update approved statuses
- Saved filters for common staff workflows

#### Order detail

- Customer and delivery address
- Items, variants, quantities, discounts, shipping, and totals
- Payment status and transaction reference
- Order status timeline
- Courier and tracking information
- Internal staff notes separated from customer-visible notes
- Contact actions
- Invoice and packing slip
- Cancel, return, refund, and replacement workflows

#### Status model

```text
pending → confirmed → processing → packed → shipped → delivered
        ↘ cancelled
delivered → return_requested → returned → refunded/replaced
```

Enforce allowed transitions in server code or a Postgres function. Do not permit arbitrary status edits.

### Products

- Draft/published/archived status
- Bangla and optional English names
- Slug, SKU, barcode, category, tags, brand
- Short summary and structured description
- Base price, compare-at price, cost price, tax behavior
- Product type and attribute-driven variants
- Weight and shipping dimensions
- Product image gallery with reordering and alt text
- Inventory policy and low-stock threshold
- SEO title and description
- Related and frequently bought-together products
- Scheduled publishing and campaign inclusion

### Inventory

- Stock by product variant
- Available, reserved, incoming, damaged, and returned quantities
- Manual adjustment with mandatory reason
- Low-stock threshold and alerts
- Stock movement history
- Prevent overselling through an atomic database function
- Reserve inventory during order confirmation and release it on cancellation or timeout

### Categories

- Parent/child hierarchy
- Bangla and English labels
- Slug and description
- Image/icon
- Display order
- Active/hidden state
- Homepage visibility
- Category-specific filters

### Customers

- Search by name, phone, or customer ID
- Profile and saved addresses
- Order history and lifetime value
- Support and order notes
- Refund/return history
- Account status
- Marketing consent state
- Data export and deletion request workflow

Sensitive data should be masked for roles that do not require full access.

### Promotions

- Fixed or percentage coupons
- Product/category/order-level scope
- Minimum spend
- Usage limits globally and per customer
- Start/end dates
- New-customer-only and customer-segment rules
- Stackable/non-stackable behavior
- Homepage campaign banners

Discount validation and total calculation must run server-side.

### Reviews

- Pending, approved, rejected, and flagged states
- Verified-purchase indicator
- Product and rating filters
- Moderation notes
- Safe customer response workflow
- No silent editing of customer review text

### Content management

Initially limit CMS scope to structured storefront content:

- Announcement bar
- Hero slides
- Homepage category order
- Featured product collections
- Seasonal campaigns
- Trust points
- FAQs and policy summaries

Avoid building a generic page builder in the first version.

### Reports

- Sales and order volume
- Average order value
- Product and category performance
- Conversion funnel when storefront analytics is connected
- Inventory valuation and movement
- Discounts and coupon impact
- Repeat-customer rate
- Delivery and cancellation performance
- CSV export using server-generated, permission-checked files

## 6. Proposed Database Schema

All tables should use UUID primary keys unless a different identifier has a clear operational benefit. Store timestamps as `timestamptz`; display them in Asia/Dhaka.

### Identity and customers

#### `profiles`

- `id uuid` → `auth.users.id`
- `phone text unique`
- `full_name text`
- `email text null`
- `avatar_path text null`
- `status text`
- `marketing_consent boolean`
- `created_at`, `updated_at`

#### `customer_addresses`

- `id`, `profile_id`
- `label`, `recipient_name`, `phone`
- `address_line`, `area`, `thana`, `district`, `postal_code`, `landmark`
- `is_default`
- timestamps

#### `staff_members`

- `user_id uuid` → `auth.users.id`
- `role staff_role`
- `is_active`
- `invited_by`, `created_at`, `last_active_at`

### Catalog

#### `categories`

- `id`, `parent_id null`
- `name_bn`, `name_en null`, `slug unique`
- `description`, `image_path`
- `sort_order`, `is_active`, `show_on_home`

#### `products`

- `id`, `slug unique`, `sku unique`
- `name_bn`, `name_en null`
- `short_description`, `description`
- `status product_status`
- `product_type`
- `category_id`, `brand_id null`
- `base_price numeric(12,2)`
- `compare_at_price numeric(12,2) null`
- `cost_price numeric(12,2) null`
- `weight_grams`, shipping dimensions
- `seo_title`, `seo_description`
- timestamps and `published_at`

#### `product_variants`

- `id`, `product_id`
- `sku unique`
- `title`, `attributes jsonb`
- `price`, `compare_at_price`, `cost_price`
- `weight_grams`
- `is_active`

#### `product_media`

- `id`, `product_id`, `variant_id null`
- `storage_path`, `media_type`, `alt_text`
- `sort_order`, timestamps

#### `inventory`

- `variant_id primary key`
- `on_hand`, `reserved`, `low_stock_threshold`
- `updated_at`

#### `inventory_movements`

- `id`, `variant_id`
- `movement_type`, `quantity_delta`
- `reference_type`, `reference_id`
- `reason`, `created_by`, `created_at`

### Orders

#### `orders`

- `id uuid`, `order_number unique`
- `customer_id null`
- customer snapshot: `customer_name`, `customer_phone`, `customer_email null`
- address snapshot fields
- `status order_status`
- `payment_status payment_status`
- `payment_method`
- `subtotal`, `discount_total`, `shipping_total`, `tax_total`, `grand_total`
- `coupon_code null`
- `customer_note`, `internal_note`
- `source`, timestamps

Snapshot fields preserve historical order data if the customer later edits an address or profile.

#### `order_items`

- `id`, `order_id`, `product_id`, `variant_id`
- snapshot: `product_name`, `variant_name`, `sku`, `image_path`
- `unit_price`, `quantity`, `discount_total`, `line_total`

#### `order_status_events`

- `id`, `order_id`
- `from_status`, `to_status`
- `note`, `customer_visible`
- `created_by`, `created_at`

#### `payments`

- `id`, `order_id`
- `provider`, `method`, `status`
- `amount`, `currency`
- `provider_reference`
- `provider_payload jsonb` with sensitive fields removed
- timestamps

#### `shipments`

- `id`, `order_id`
- `courier`, `tracking_number`, `status`
- `shipping_cost`
- `shipped_at`, `delivered_at`
- sanitized provider response

### Commerce features

- `coupons`
- `coupon_redemptions`
- `wishlists`
- `wishlist_items`
- `reviews`
- `collections`
- `collection_products`
- `homepage_sections`
- `notifications`
- `support_notes`
- `store_settings`
- `audit_logs`

## 7. Row Level Security Plan

Enable RLS on every exposed application table.

### Customer policies

- Customers may read and update only their own `profiles` row.
- Customers may CRUD only addresses linked to `auth.uid()`.
- Customers may read only orders where `customer_id = auth.uid()`.
- Order creation should use a server action or controlled database function, not broad direct insert permissions.
- Customers may manage only their own wishlist.
- Customers may create reviews only for their own delivered order items.

### Staff policies

- Active staff can access only the tables and actions allowed by role.
- Support agents receive read access to catalog and limited customer/order access.
- Catalog managers cannot manage staff roles, payments, or secret settings.
- Only super admins can manage staff membership and integration configuration.
- High-risk writes should use permission-checked Postgres functions rather than broad table update policies.

### Public storefront policies

- Anonymous users may read only published products, active categories, public media, approved reviews, and active campaigns.
- Cost prices, inventory internals, customer data, drafts, audit logs, and admin notes must never be publicly selectable.

### Service role

- Never expose the secret/service-role key to the browser.
- Use it only in trusted server routes, scheduled jobs, webhooks, and tightly scoped Edge Functions.
- Validate webhook signatures before performing privileged operations.

## 8. Supabase Storage Plan

### Buckets

| Bucket | Visibility | Content |
| --- | --- | --- |
| `product-media` | Public read, staff write | Product images and videos |
| `category-media` | Public read, staff write | Category and campaign assets |
| `avatars` | Controlled read/write | Customer/staff avatars |
| `return-evidence` | Private | Customer return photos/videos |
| `exports` | Private, short-lived signed URLs | Reports and data exports |

### Upload rules

- Validate MIME type, file size, extension, and image dimensions.
- Generate collision-resistant paths.
- Store only the path in application tables, not a duplicated public URL.
- Use signed URLs for private objects.
- Restrict write/delete operations using Storage RLS.
- Create responsive image derivatives outside the request path if needed.

## 9. Realtime, Notifications, and Integrations

### Realtime

Use Realtime selectively:

- New order notification in the admin panel
- Order status updates in the customer account
- Low-stock alerts
- Concurrent order-assignment visibility

Do not subscribe every admin screen to entire tables. Use private channels, scoped topics, and Realtime authorization.

### SMS

- Customer OTP
- Order confirmed
- Order shipped with tracking
- Delivery attempt or completion
- Cancellation/refund updates

SMS sending beyond Auth OTP should run from a trusted Edge Function or server integration with rate limits and delivery logging.

### Payments

Design for adapters rather than embedding one gateway throughout the code:

- Cash on delivery first
- Bangladesh payment gateway selected later
- Create payment intent/session server-side
- Verify callbacks/webhooks cryptographically
- Make webhook processing idempotent
- Never mark an order paid from a client redirect alone

### Courier

- Manual courier and tracking entry in phase one
- Courier API adapter in a later phase
- Preserve provider request/response identifiers for reconciliation

### Database webhooks

Use asynchronous database webhooks for non-transactional external effects, such as notifying an integration after an order status change. Critical database invariants remain in transactions/functions.

## 10. Admin UX and Visual Direction

The admin should reuse the storefront typography and brand colors but prioritize density and operational clarity.

### Layout

- Collapsible left navigation
- Persistent top bar with search, alerts, and staff profile
- 1280–1440px working canvas
- Responsive tablet support; desktop is the primary admin target
- Mobile supports essential order lookup and status actions, not every bulk workflow

### Component system

- Data table with filtering, sorting, column control, selection, and pagination
- Status badges based on text and icon, not color alone
- Searchable comboboxes
- Date and price inputs
- Product/media uploader
- Confirmation dialogs for destructive actions
- Side panels for quick order/customer inspection
- Empty, loading, error, partial-data, and permission-denied states
- Toasts only for transient feedback; important errors stay near the relevant control

### Safety patterns

- Require confirmation for cancellation, refund, deletion, and role changes.
- Prefer archive over permanent deletion for products and categories.
- Show unsaved-change warnings.
- Record actor, action, target, timestamp, and relevant before/after data in `audit_logs`.
- Mask secrets and sensitive customer fields.

## 11. Server-Side Business Rules

The following must not rely only on React state:

- Product and variant price validation
- Coupon eligibility and discount calculation
- Shipping-charge calculation
- Final order totals
- Inventory reservation and release
- Allowed order status transitions
- Refund amount limits
- Staff permissions
- Review purchase verification
- Payment and courier webhook verification

Use server actions/route handlers for ordinary mutations and Postgres functions for operations requiring atomic multi-table updates.

## 12. Migration from the Current Prototype

### Replace local-only state

- Cart: keep browser persistence for guest carts, then optionally sync after login.
- Account: replace `torun-mart-account` local storage with Supabase Auth/session.
- OTP: replace demo code `123456` with `signInWithOtp` and `verifyOtp`.
- Products: move hardcoded arrays to database queries.
- Orders: replace frontend-only confirmation with an atomic server-side order-creation function.
- Addresses: replace mock address UI with `customer_addresses` CRUD.
- Orders and profile: load from protected Supabase queries.

### Data import

1. Export products, categories, customers, orders, reviews, and media references from WooCommerce.
2. Clean SKU, slug, phone, category, pricing, and duplicate data.
3. Upload product media to Storage or retain approved source URLs temporarily.
4. Import catalog first and validate counts/totals.
5. Import historical orders as immutable snapshots.
6. Reconcile samples against WooCommerce before cutover.

## 13. Implementation Phases

### Phase 1 — Supabase foundation

- Create development and production Supabase projects.
- Install Supabase packages and add typed clients.
- Define migrations, enums, tables, indexes, functions, and RLS.
- Generate TypeScript database types.
- Configure local development and environment variables.
- Add seed data.

### Phase 2 — Authentication and access

- Connect customer phone OTP.
- Configure SMS provider and production rate limits.
- Build staff sign-in and mandatory MFA.
- Add protected admin layout and role checks.
- Add staff invitation and deactivation workflow.

### Phase 3 — Catalog and media

- Categories, products, variants, media, and inventory.
- Product editor with validation and draft/publish flow.
- Replace storefront hardcoded catalog data.

### Phase 4 — Orders and checkout

- Server-side cart pricing and checkout.
- Atomic order creation and inventory reservation.
- Admin order list/detail/status workflow.
- Customer order history and tracking.
- COD first, then payment adapter.

### Phase 5 — Operations

- Customers, reviews, promotions, content, notifications.
- Courier integration.
- Returns, refunds, and replacements.

### Phase 6 — Reporting and hardening

- Reports and exports.
- Audit log interface.
- Security review and RLS tests.
- Performance/index tuning.
- Backup, recovery, monitoring, and launch runbooks.

## 14. Testing Strategy

- Unit tests for totals, discounts, shipping, and status transitions
- Database tests for RLS by anonymous, customer, and every staff role
- Integration tests for order creation and inventory reservation
- End-to-end tests for OTP, checkout, admin processing, cancellation, and delivery
- Webhook signature and replay/idempotency tests
- Accessibility tests for forms, dialogs, tables, and keyboard navigation
- Upload tests for invalid type, oversized files, and unauthorized access
- Concurrent inventory tests to prevent overselling

## 15. Operational Requirements

- Separate development and production projects
- Migrations committed to the repository; no untracked production-only schema edits
- Daily backup strategy and tested restore procedure
- Error monitoring for Next.js, Edge Functions, and integration failures
- Structured logs with order IDs and request IDs but no OTPs, tokens, or unnecessary personal data
- Admin audit retention policy
- Secret rotation procedure
- SMS and payment usage/cost alerts
- Database performance and storage monitoring

## 16. Definition of Done

- Customers can request and verify a real SMS OTP and receive a secure server-side session.
- Unauthorized users cannot load `/admin` or call admin mutations.
- Each role passes positive and negative access tests.
- Staff can create, publish, archive, and update products with media and variants.
- Stock updates and order reservations are atomic and auditable.
- Staff can process orders through valid statuses and customers can see the timeline.
- Checkout calculates all prices on the server and stores order snapshots.
- Private customer, return, export, and integration data is protected by RLS.
- No secret/service-role key appears in client output.
- Admin workflows pass responsive, accessibility, and failure-state QA.
- Backup and rollback procedures are documented and tested.

## 17. Decisions Needed Before Implementation

1. Which SMS provider has the best verified delivery and pricing for Bangladesh: Twilio, MessageBird, or Vonage?
2. Which Bangladesh payment gateway will be used after COD?
3. Which courier services need integration?
4. Which staff roles are required at launch and who receives `super_admin`?
5. Should historical WooCommerce customers and orders be imported?
6. Is inventory tracked only as a total or by physical location/warehouse?
7. Are product prices tax-inclusive?
8. Which return/refund rules must the admin enforce automatically?

## 18. First Implementation Sprint

After approving this plan, the first sprint should deliver:

1. Supabase package installation and environment template
2. Browser/server Supabase clients and session refresh handling
3. Initial SQL migration for profiles, staff, categories, products, variants, media, and inventory
4. RLS helper functions and baseline policies
5. Generated database TypeScript types
6. Protected `/admin` shell with role-aware navigation
7. Admin dashboard skeleton using real Supabase queries
8. Replacement of demo customer OTP with real Supabase Phone Auth
