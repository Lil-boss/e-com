alter table public.products
  add column if not exists uom text,
  add column if not exists uom_value numeric(12,3),
  add column if not exists discount numeric(12,2) check (discount is null or discount >= 0),
  add column if not exists upc_no text,
  add column if not exists ean_no text,
  add column if not exists isbn_no text,
  add column if not exists part_no text,
  add column if not exists price_includes_vat boolean;

create index if not exists products_upc_no_idx on public.products(upc_no) where upc_no is not null;
create index if not exists products_ean_no_idx on public.products(ean_no) where ean_no is not null;
create index if not exists products_isbn_no_idx on public.products(isbn_no) where isbn_no is not null;
create index if not exists products_part_no_idx on public.products(part_no) where part_no is not null;
