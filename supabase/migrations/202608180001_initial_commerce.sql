create extension if not exists pgcrypto;

create type public.staff_role as enum ('super_admin','admin','order_manager','catalog_manager','support_agent','viewer');
create type public.product_status as enum ('draft','published','archived');
create type public.order_status as enum ('pending','confirmed','processing','packed','shipped','delivered','cancelled','return_requested','returned','refunded','replaced');
create type public.payment_status as enum ('pending','authorized','paid','failed','refunded','partially_refunded');
create type public.review_status as enum ('pending','approved','rejected','flagged');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text not null default '',
  email text,
  avatar_path text,
  status text not null default 'active' check (status in ('active','blocked','deleted')),
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'বাসা', recipient_name text not null, phone text not null,
  address_line text not null, area text, thana text not null, district text not null,
  postal_code text, landmark text, is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), parent_id uuid references public.categories(id) on delete set null,
  name_bn text not null, name_en text, slug text not null unique, description text, image_path text,
  sort_order integer not null default 0, is_active boolean not null default true,
  show_on_home boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id) on delete set null,
  name_bn text not null, name_en text, slug text not null unique, sku text not null unique,
  short_description text, description text, status public.product_status not null default 'draft',
  product_type text not null default 'simple', base_price numeric(12,2) not null check(base_price >= 0),
  compare_at_price numeric(12,2), cost_price numeric(12,2), weight_grams integer,
  seo_title text, seo_description text, is_featured boolean not null default false,
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique, title text not null, attributes jsonb not null default '{}',
  price numeric(12,2) not null check(price >= 0), compare_at_price numeric(12,2), cost_price numeric(12,2),
  weight_grams integer, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade, storage_path text not null,
  media_type text not null default 'image', alt_text text, sort_order integer not null default 0, created_at timestamptz not null default now()
);

create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  on_hand integer not null default 0 check(on_hand >= 0), reserved integer not null default 0 check(reserved >= 0),
  low_stock_threshold integer not null default 5, updated_at timestamptz not null default now(),
  check(reserved <= on_hand)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id),
  movement_type text not null, quantity_delta integer not null, reference_type text, reference_id uuid,
  reason text not null, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique, discount_type text not null check(discount_type in ('fixed','percentage')),
  discount_value numeric(12,2) not null, minimum_spend numeric(12,2) not null default 0,
  usage_limit integer, per_customer_limit integer, starts_at timestamptz, ends_at timestamptz,
  is_active boolean not null default true, rules jsonb not null default '{}', created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null, customer_phone text not null, customer_email text,
  address_line text not null, area text, thana text not null, district text not null, postal_code text, landmark text,
  status public.order_status not null default 'pending', payment_status public.payment_status not null default 'pending',
  payment_method text not null default 'cod', subtotal numeric(12,2) not null, discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0, tax_total numeric(12,2) not null default 0, grand_total numeric(12,2) not null,
  coupon_code text, customer_note text, internal_note text, source text not null default 'web',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null, variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null, variant_name text, sku text not null, image_path text,
  unit_price numeric(12,2) not null, quantity integer not null check(quantity > 0),
  discount_total numeric(12,2) not null default 0, line_total numeric(12,2) not null
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status, to_status public.order_status not null, note text,
  customer_visible boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  provider text, method text not null, status public.payment_status not null default 'pending', amount numeric(12,2) not null,
  currency text not null default 'BDT', provider_reference text, provider_payload jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  courier text, tracking_number text, status text not null default 'pending', shipping_cost numeric(12,2),
  shipped_at timestamptz, delivered_at timestamptz, provider_response jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null, order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check(rating between 1 and 5), title text, body text not null,
  status public.review_status not null default 'pending', is_verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(), section_key text not null unique,
  section_type text not null, title text, subtitle text, content jsonb not null default '{}',
  is_active boolean not null default true, sort_order integer not null default 0,
  starts_at timestamptz, ends_at timestamptz, updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key, value jsonb not null, is_public boolean not null default false,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  action text not null, entity_type text not null, entity_id text, before_data jsonb, after_data jsonb,
  ip_address inet, created_at timestamptz not null default now()
);

create index products_category_status_idx on public.products(category_id,status);
create index products_featured_idx on public.products(is_featured) where status='published';
create index orders_customer_idx on public.orders(customer_id,created_at desc);
create index orders_status_created_idx on public.orders(status,created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index reviews_product_status_idx on public.reviews(product_id,status);

create or replace function public.is_staff(required_roles public.staff_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_members s where s.user_id=auth.uid() and s.is_active and (required_roles is null or s.role=any(required_roles)));
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','customer_addresses','categories','products','product_variants','inventory','orders','payments','shipments','reviews'] loop execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',t,t); end loop; end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,phone,email,full_name) values(new.id,new.phone,new.email,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security; alter table public.staff_members enable row level security;
alter table public.customer_addresses enable row level security; alter table public.categories enable row level security;
alter table public.products enable row level security; alter table public.product_variants enable row level security;
alter table public.product_media enable row level security; alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security; alter table public.coupons enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security; alter table public.payments enable row level security;
alter table public.shipments enable row level security; alter table public.reviews enable row level security;
alter table public.homepage_sections enable row level security; alter table public.store_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_own_select on public.profiles for select using(id=auth.uid() or public.is_staff());
create policy profiles_own_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy staff_self_select on public.staff_members for select using(user_id=auth.uid() or public.is_staff(array['super_admin']::public.staff_role[]));
create policy staff_super_manage on public.staff_members for all using(public.is_staff(array['super_admin']::public.staff_role[])) with check(public.is_staff(array['super_admin']::public.staff_role[]));
create policy addresses_own on public.customer_addresses for all using(profile_id=auth.uid() or public.is_staff()) with check(profile_id=auth.uid() or public.is_staff());
create policy categories_public_read on public.categories for select using(is_active or public.is_staff());
create policy products_public_read on public.products for select using(status='published' or public.is_staff());
create policy variants_public_read on public.product_variants for select using(is_active and exists(select 1 from public.products p where p.id=product_id and p.status='published') or public.is_staff());
create policy media_public_read on public.product_media for select using(exists(select 1 from public.products p where p.id=product_id and p.status='published') or public.is_staff());
create policy catalog_staff_manage_categories on public.categories for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy catalog_staff_manage_products on public.products for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy catalog_staff_manage_variants on public.product_variants for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy catalog_staff_manage_media on public.product_media for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy inventory_staff_read on public.inventory for select using(public.is_staff());
create policy inventory_staff_manage on public.inventory for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy movements_staff on public.inventory_movements for select using(public.is_staff());
create policy orders_customer_read on public.orders for select using(customer_id=auth.uid() or public.is_staff());
create policy order_items_customer_read on public.order_items for select using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or public.is_staff())));
create policy order_events_customer_read on public.order_status_events for select using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=auth.uid() or public.is_staff())) and (customer_visible or public.is_staff()));
create policy order_staff_manage on public.orders for all using(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]));
create policy order_items_staff_manage on public.order_items for all using(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]));
create policy payments_staff on public.payments for select using(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]));
create policy shipments_staff on public.shipments for all using(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]));
create policy reviews_public_read on public.reviews for select using(status='approved' or customer_id=auth.uid() or public.is_staff());
create policy reviews_customer_insert on public.reviews for insert with check(customer_id=auth.uid());
create policy reviews_staff_manage on public.reviews for all using(public.is_staff(array['super_admin','admin','catalog_manager','support_agent']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager','support_agent']::public.staff_role[]));
create policy homepage_public_read on public.homepage_sections for select using(is_active or public.is_staff());
create policy settings_public_read on public.store_settings for select using(is_public or public.is_staff());
create policy content_staff_manage on public.homepage_sections for all using(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy settings_admin_manage on public.store_settings for all using(public.is_staff(array['super_admin','admin']::public.staff_role[])) with check(public.is_staff(array['super_admin','admin']::public.staff_role[]));
create policy audit_admin_read on public.audit_logs for select using(public.is_staff(array['super_admin','admin']::public.staff_role[]));

insert into storage.buckets(id,name,public) values ('product-media','product-media',true),('category-media','category-media',true),('avatars','avatars',false),('return-evidence','return-evidence',false),('exports','exports',false) on conflict(id) do nothing;
create policy public_catalog_media_read on storage.objects for select using(bucket_id in ('product-media','category-media'));
create policy staff_catalog_media_insert on storage.objects for insert with check(bucket_id in ('product-media','category-media') and public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy staff_catalog_media_update on storage.objects for update using(bucket_id in ('product-media','category-media') and public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
create policy staff_catalog_media_delete on storage.objects for delete using(bucket_id in ('product-media','category-media') and public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[]));
