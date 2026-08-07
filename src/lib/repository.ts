import { supabase } from './supabase';
import type { Account, Category, Holding, Transaction } from './types';

/**
 * Every function here assumes an authenticated session. RLS enforces the
 * user_id scoping server-side, but we still pass user_id explicitly on
 * inserts because Postgres can't infer it from auth.uid() automatically for
 * a plain client insert.
 */

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// --- Accounts ---------------------------------------------------------

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('created_at');
  if (error) throw error;
  return data as Account[];
}

export async function insertAccount(
  input: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Account> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Account;
}

export async function updateAccount(
  id: string,
  input: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Account> {
  const { data, error } = await supabase.from('accounts').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Account;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}

// --- Categories ---------------------------------------------------------

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data as Category[];
}

export async function insertCategory(
  input: Omit<Category, 'id' | 'user_id' | 'created_at' | 'is_uncategorized'>,
): Promise<Category> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id, is_uncategorized: false })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  id: string,
  input: Partial<Pick<Category, 'name' | 'kind' | 'monthly_limit_cents'>>,
): Promise<Category> {
  const { data, error } = await supabase.from('categories').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Category;
}

/** Deletes a category and reassigns its transactions to Uncategorized. */
export async function deleteCategory(id: string): Promise<void> {
  const categories = await listCategories();
  const fallback = categories.find((c) => c.is_uncategorized);
  if (!fallback) throw new Error('No Uncategorized category found for this user.');

  const { error: reassignError } = await supabase
    .from('transactions')
    .update({ category_id: fallback.id })
    .eq('category_id', id);
  if (reassignError) throw reassignError;

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// --- Transactions ---------------------------------------------------------

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  direction?: 'in' | 'out';
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<{ rows: Transaction[]; count: number }> {
  let query = supabase.from('transactions').select('*', { count: 'exact' }).order('date', { ascending: false });

  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.direction === 'in') query = query.lt('amount_cents', 0);
  if (filters.direction === 'out') query = query.gt('amount_cents', 0);
  if (filters.startDate) query = query.gte('date', filters.startDate);
  if (filters.endDate) query = query.lte('date', filters.endDate);
  if (filters.search) query = query.or(`merchant.ilike.%${filters.search}%,raw_text.ilike.%${filters.search}%`);
  if (filters.limit !== undefined) {
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data as Transaction[], count: count ?? 0 };
}

export async function insertTransaction(
  input: Omit<Transaction, 'id' | 'user_id' | 'created_at'>,
): Promise<Transaction> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;

  // Keep the account balance in sync with the manual entry.
  await adjustAccountBalance(input.account_id, input.amount_cents);

  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  input: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>,
): Promise<Transaction> {
  const { data: before, error: beforeErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  if (beforeErr) throw beforeErr;

  const { data, error } = await supabase.from('transactions').update(input).eq('id', id).select().single();
  if (error) throw error;

  if (input.amount_cents !== undefined && input.amount_cents !== before.amount_cents) {
    const delta = input.amount_cents - before.amount_cents;
    await adjustAccountBalance(before.account_id, delta);
  }

  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { data: tx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;

  // Reverse the balance effect of the deleted transaction.
  await adjustAccountBalance(tx.account_id, -tx.amount_cents);
}

async function adjustAccountBalance(accountId: string, amountCentsDelta: number): Promise<void> {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('balance_cents, type')
    .eq('id', accountId)
    .single();
  if (error) throw error;

  // Outflow (positive amount) reduces cash/invested balances but *increases*
  // an owed (credit card) balance; inflow does the reverse.
  const direction = account.type === 'owed' ? 1 : -1;
  const newBalance = account.balance_cents + direction * amountCentsDelta;

  const { error: updateErr } = await supabase
    .from('accounts')
    .update({ balance_cents: newBalance })
    .eq('id', accountId);
  if (updateErr) throw updateErr;
}

// --- Holdings ---------------------------------------------------------

export async function listHoldings(): Promise<Holding[]> {
  const { data, error } = await supabase.from('holdings').select('*').order('created_at');
  if (error) throw error;
  return data as Holding[];
}

export async function insertHolding(
  input: Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Holding> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('holdings')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Holding;
}

export async function updateHolding(
  id: string,
  input: Partial<Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Holding> {
  const { data, error } = await supabase.from('holdings').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Holding;
}

export async function deleteHolding(id: string): Promise<void> {
  const { error } = await supabase.from('holdings').delete().eq('id', id);
  if (error) throw error;
}

// --- Net worth trend ---------------------------------------------------------

/**
 * Derives a trailing series from current account balances. This is a
 * simplification vs. the original month-by-month snapshot table — accurate
 * "as of today" history requires snapshots to be written over time (e.g. a
 * scheduled function), which is a good next step once this is deployed.
 */
export async function getNetWorthSeries(months: number): Promise<{ month: string; value: number }[]> {
  const accounts = await listAccounts();
  const total = accounts.reduce((sum, a) => sum + (a.type === 'owed' ? -a.balance_cents : a.balance_cents), 0);

  const series: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({ month: d.toISOString().slice(0, 7), value: total });
  }
  return series;
}
