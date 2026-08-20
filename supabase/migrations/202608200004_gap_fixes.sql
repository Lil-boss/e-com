-- Coupons had RLS enabled with no policy at all: unreachable for every role.
create policy coupons_staff_manage on public.coupons for all
  using (public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]))
  with check (public.is_staff(array['super_admin','admin','order_manager']::public.staff_role[]));

-- audit_logs and order_status_events only had SELECT policies, so every admin
-- insert into them was silently rejected. Same fix migration 3 applied to inventory_movements.
create policy audit_staff_insert on public.audit_logs for insert
  with check (public.is_staff() and actor_id = auth.uid());

create policy order_events_staff_insert on public.order_status_events for insert
  with check (public.is_staff(array['super_admin','admin','order_manager','support_agent']::public.staff_role[]));

-- Stock lifecycle. Reserve on order placement, release on cancel, consume on delivery.
-- security definer: order_manager may move order status but has no inventory policy.
create or replace function public.reserve_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; touched integer;
begin
  for item in select variant_id, quantity, product_name from public.order_items
              where order_id = p_order_id and variant_id is not null loop
    update public.inventory set reserved = reserved + item.quantity
      where variant_id = item.variant_id and on_hand - reserved >= item.quantity;
    get diagnostics touched = row_count;
    if touched = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', item.product_name;
    end if;
    insert into public.inventory_movements(variant_id, movement_type, quantity_delta, reference_type, reference_id, reason)
      values (item.variant_id, 'reserve', 0, 'order', p_order_id, 'Reserved for order');
  end loop;
end $$;

-- greatest(): orders placed before reservation existed never reserved anything.
create or replace function public.release_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;
  for item in select variant_id, quantity from public.order_items
              where order_id = p_order_id and variant_id is not null loop
    update public.inventory set reserved = greatest(reserved - item.quantity, 0) where variant_id = item.variant_id;
    insert into public.inventory_movements(variant_id, movement_type, quantity_delta, reference_type, reference_id, reason, created_by)
      values (item.variant_id, 'release', 0, 'order', p_order_id, 'Reservation released', auth.uid());
  end loop;
end $$;

create or replace function public.consume_order_stock(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if not public.is_staff() then raise exception 'Forbidden'; end if;
  for item in select variant_id, quantity from public.order_items
              where order_id = p_order_id and variant_id is not null loop
    update public.inventory
      set on_hand = greatest(on_hand - item.quantity, 0), reserved = greatest(reserved - item.quantity, 0)
      where variant_id = item.variant_id;
    insert into public.inventory_movements(variant_id, movement_type, quantity_delta, reference_type, reference_id, reason, created_by)
      values (item.variant_id, 'sale', -item.quantity, 'order', p_order_id, 'Delivered to customer', auth.uid());
  end loop;
end $$;

-- Only the checkout route (service key) may reserve; staff routes call the other two.
-- Functions are executable by PUBLIC by default, so revoke that before granting.
revoke execute on function public.reserve_order_stock(uuid) from public;
revoke execute on function public.release_order_stock(uuid) from public;
revoke execute on function public.consume_order_stock(uuid) from public;
grant execute on function public.reserve_order_stock(uuid) to service_role;
grant execute on function public.release_order_stock(uuid), public.consume_order_stock(uuid) to authenticated, service_role;

-- one shipment row per order, so the admin panel can upsert courier/tracking
create unique index if not exists shipments_order_unique on public.shipments(order_id);
