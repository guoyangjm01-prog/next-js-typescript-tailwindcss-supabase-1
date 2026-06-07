create table if not exists public.calculation_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_invested numeric not null,
  estimated_profit numeric not null,
  final_asset numeric not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.calculation_records enable row level security;

create policy "Users can read own calculation records"
  on public.calculation_records
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own calculation records"
  on public.calculation_records
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own calculation records"
  on public.calculation_records
  for delete
  using (auth.uid() = user_id);
