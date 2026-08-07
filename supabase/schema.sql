-- Finance dashboard schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- Conventions carried over from the original app:
--   - All money is integer cents (no floats).
--   - Account balances are positive magnitudes; sign is derived from `type`.
--   - Transaction `amount` is positive for money OUT, negative for money IN
--     (this matches Plaid's convention, so a future aggregator swap is a
--     data-source change, not a schema change).

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (type in ('cash', 'invested', 'owed')),
  subtype text,
  mask text,
  balance_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('spending', 'income', 'transfer')),
  monthly_limit_cents bigint, -- null = no limit set
  is_uncategorized boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every user gets exactly one protected "Uncategorized" row; enforced in app
-- code on signup (see lib/bootstrapUser.ts), not here, since Postgres can't
-- easily express "exactly one per user" as a constraint alongside the rest.

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  date date not null,
  merchant text not null,
  raw_text text,
  amount_cents bigint not null, -- positive = outflow, negative = inflow
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on transactions (user_id, date desc);
create index if not exists transactions_account_idx on transactions (account_id);
create index if not exists transactions_category_idx on transactions (category_id);

-- ---------------------------------------------------------------------------
-- holdings
-- ---------------------------------------------------------------------------
create table if not exists holdings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  symbol text not null,
  name text,
  quantity numeric not null,
  cost_basis_cents bigint,
  institution_value_cents bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holdings_account_idx on holdings (account_id);

-- ---------------------------------------------------------------------------
-- net_worth_snapshots (one row per month, keeps the trend chart cheap)
-- ---------------------------------------------------------------------------
create table if not exists net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, -- always the 1st of the month
  cash_cents bigint not null default 0,
  invested_cents bigint not null default 0,
  owed_cents bigint not null default 0,
  unique (user_id, month)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists accounts_set_updated_at on accounts;
create trigger accounts_set_updated_at before update on accounts
  for each row execute function set_updated_at();

drop trigger if exists holdings_set_updated_at on holdings;
create trigger holdings_set_updated_at before update on holdings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is scoped to auth.uid()
-- ---------------------------------------------------------------------------
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table holdings enable row level security;
alter table net_worth_snapshots enable row level security;

create policy "accounts_select_own" on accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts for delete using (auth.uid() = user_id);

create policy "categories_select_own" on categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on categories for update using (auth.uid() = user_id);
create policy "categories_delete_own" on categories for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on transactions for delete using (auth.uid() = user_id);

create policy "holdings_select_own" on holdings for select using (auth.uid() = user_id);
create policy "holdings_insert_own" on holdings for insert with check (auth.uid() = user_id);
create policy "holdings_update_own" on holdings for update using (auth.uid() = user_id);
create policy "holdings_delete_own" on holdings for delete using (auth.uid() = user_id);

create policy "snapshots_select_own" on net_worth_snapshots for select using (auth.uid() = user_id);
create policy "snapshots_insert_own" on net_worth_snapshots for insert with check (auth.uid() = user_id);
create policy "snapshots_update_own" on net_worth_snapshots for update using (auth.uid() = user_id);
create policy "snapshots_delete_own" on net_worth_snapshots for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed an "Uncategorized" category automatically for every new user
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into categories (user_id, name, kind, is_uncategorized)
  values (new.id, 'Uncategorized', 'spending', true);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
