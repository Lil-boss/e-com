create policy movements_staff_insert on public.inventory_movements
for insert with check (
  public.is_staff(array['super_admin','admin','catalog_manager']::public.staff_role[])
  and created_by = auth.uid()
);
