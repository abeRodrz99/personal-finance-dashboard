-- Finance dashboard schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
--
-- Conventions:
--   - All money is integer cents (no floats).
--   - Account balances are positive magnitudes; sign is derived from `type`.
--   - Transaction `amount` is positive for money OUT, negative for money IN.

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
  opening_balance_cents bigint,
  opening_balance_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- category_groups
-- ---------------------------------------------------------------------------
create table if not exists category_groups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  monthly_limit_cents bigint,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references category_groups(id) on delete set null,
  name text not null,
  kind text not null check (kind in ('spending', 'income', 'transfer')),
  monthly_limit_cents bigint,
  is_uncategorized boolean not null default false,
  created_at timestamptz not null default now()
);

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
  amount_cents bigint not null,
  is_ignored boolean not null default false,
  split_parent_id uuid,
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
  opening_value_cents bigint,
  opening_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holdings_account_idx on holdings (account_id);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_cents bigint not null,
  current_cents bigint not null default 0,
  linked_account_id uuid references accounts(id) on delete set null,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

drop trigger if exists goals_set_updated_at on goals;
create trigger goals_set_updated_at before update on goals
  for each row execute function set_updated_at();

drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table accounts enable row level security;
alter table category_groups enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table holdings enable row level security;
alter table goals enable row level security;
alter table notes enable row level security;

create policy "accounts_select_own" on accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts for delete using (auth.uid() = user_id);

create policy "category_groups_select_own" on category_groups for select using (auth.uid() = user_id);
create policy "category_groups_insert_own" on category_groups for insert with check (auth.uid() = user_id);
create policy "category_groups_update_own" on category_groups for update using (auth.uid() = user_id);
create policy "category_groups_delete_own" on category_groups for delete using (auth.uid() = user_id);

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

create policy "goals_select_own" on goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on goals for delete using (auth.uid() = user_id);

create policy "notes_select_own" on notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on notes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed Essentials / Personal / Savings + Uncategorized for every new user
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
declare
  essentials_id uuid;
  personal_id uuid;
  savings_id uuid;
begin
  insert into public.categories (user_id, name, kind, is_uncategorized)
  values (new.id, 'Uncategorized', 'spending', true);

  insert into public.category_groups (user_id, name, sort_order) values (new.id, 'Essentials', 0) returning id into essentials_id;
  insert into public.category_groups (user_id, name, sort_order) values (new.id, 'Personal', 1) returning id into personal_id;
  insert into public.category_groups (user_id, name, sort_order) values (new.id, 'Savings', 2) returning id into savings_id;

  insert into public.categories (user_id, name, kind, group_id) values
    (new.id, 'Rent', 'spending', essentials_id),
    (new.id, 'Groceries', 'spending', essentials_id),
    (new.id, 'Transportation', 'spending', essentials_id),
    (new.id, 'Self Care', 'spending', personal_id),
    (new.id, 'Dates', 'spending', personal_id),
    (new.id, 'Savings', 'spending', savings_id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
