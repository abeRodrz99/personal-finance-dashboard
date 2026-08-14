import { supabase } from './supabase';
import type { Account, Category, CategoryGroup, Goal, Holding, Transaction } from './types';

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


// --- Category Groups ---------------------------------------------------------

export async function listCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase.from('category_groups').select('*').order('sort_order');
  if (error) throw error;
  return data as CategoryGroup[];
}

export async function insertCategoryGroup(name: string, monthlyLimitCents: number | null = null): Promise<CategoryGroup> {
  const user_id = await currentUserId();
  const existing = await listCategoryGroups();
  const sort_order = existing.length;
  const { data, error } = await supabase
    .from('category_groups')
    .insert({ user_id, name, sort_order, monthly_limit_cents: monthlyLimitCents })
    .select()
    .single();
  if (error) throw error;
  return data as CategoryGroup;
}

export async function updateCategoryGroup(
  id: string,
  name: string,
  monthlyLimitCents: number | null = null,
): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .update({ name, monthly_limit_cents: monthlyLimitCents })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CategoryGroup;
}

/** Deletes a group; its categories become ungrouped (not deleted). */
export async function deleteCategoryGroup(id: string): Promise<void> {
  const { error: ungroupErr } = await supabase.from('categories').update({ group_id: null }).eq('group_id', id);
  if (ungroupErr) throw ungroupErr;

  const { error } = await supabase.from('category_groups').delete().eq('id', id);
  if (error) throw error;
}

// --- Goals ---------------------------------------------------------

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from('goals').select('*').order('created_at');
  if (error) throw error;
  return data as Goal[];
}

export async function insertGoal(
  input: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<Goal> {
  const user_id = await currentUserId();
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(
  id: string,
  input: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Goal> {
  const { data, error } = await supabase.from('goals').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

/**
 * A goal's current progress is either its own manually-tracked `current_cents`,
 * or, if linked to an account, that account's live balance — so a goal linked
 * to your Emergency Fund account stays accurate automatically as you log
 * transactions against it, with nothing extra to update by hand.
 */
export function resolveGoalProgress(goal: Goal, accounts: Account[]): number {
  if (goal.linked_account_id) {
    const account = accounts.find((a) => a.id === goal.linked_account_id);
    return account ? account.balance_cents : 0;
  }
  return goal.current_cents;
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
  input: Partial<Pick<Category, 'name' | 'kind' | 'monthly_limit_cents' | 'group_id'>>,
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

/** Deletes multiple transactions, correctly reversing each one's balance effect. */
export async function bulkDeleteTransactions(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteTransaction(id);
  }
}

/** Sets is_ignored on multiple transactions at once — no balance effect either way. */
export async function bulkSetTransactionsIgnored(ids: string[], ignored: boolean): Promise<void> {
  const { error } = await supabase.from('transactions').update({ is_ignored: ignored }).in('id', ids);
  if (error) throw error;
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

  await adjustAccountBalanceRaw(input.account_id, input.institution_value_cents);

  return data as Holding;
}

export async function updateHolding(
  id: string,
  input: Partial<Omit<Holding, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<Holding> {
  const { data: before, error: beforeErr } = await supabase.from('holdings').select('*').eq('id', id).single();
  if (beforeErr) throw beforeErr;

  const { data, error } = await supabase.from('holdings').update(input).eq('id', id).select().single();
  if (error) throw error;

  if (
    input.institution_value_cents !== undefined &&
    input.institution_value_cents !== before.institution_value_cents
  ) {
    const delta = input.institution_value_cents - before.institution_value_cents;
    await adjustAccountBalanceRaw(before.account_id, delta);
  }

  return data as Holding;
}

export async function deleteHolding(id: string): Promise<void> {
  const { data: holding, error: fetchErr } = await supabase.from('holdings').select('*').eq('id', id).single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase.from('holdings').delete().eq('id', id);
  if (error) throw error;

  await adjustAccountBalanceRaw(holding.account_id, -holding.institution_value_cents);
}

export async function findOrCreateInvestedAccount(name: string, institution: string | null): Promise<Account> {
  const trimmed = name.trim();
  const existing = (await listAccounts()).find(
    (a) => a.type === 'invested' && a.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing;

  return insertAccount({
    name: trimmed,
    institution,
    type: 'invested',
    subtype: null,
    mask: null,
    balance_cents: 0,
    opening_balance_cents: null,
    opening_balance_date: null,
  });
}

/** Adds a cents delta straight to an account's balance, no sign flipping (used for holdings). */
async function adjustAccountBalanceRaw(accountId: string, centsDelta: number): Promise<void> {
  const { data: account, error } = await supabase.from('accounts').select('balance_cents').eq('id', accountId).single();
  if (error) throw error;

  const { error: updateErr } = await supabase
    .from('accounts')
    .update({ balance_cents: account.balance_cents + centsDelta })
    .eq('id', accountId);
  if (updateErr) throw updateErr;
}

// --- Net worth trend ---------------------------------------------------------

export type NetWorthGranularity = 'day' | 'month';

/**
 * Reconstructs net worth at each point in a trailing window, per account,
 * then sums the results. No separate snapshot table needed, and no waiting
 * for real time to pass to see history.
 *
 * For each cash/owed account: work backward from today's balance by adding
 * back every transaction dated after the point in question (a transaction's
 * balance effect is always direction * amount_cents, where direction is +1
 * for owed accounts and -1 otherwise). This is accurate for any point on or
 * after the account's `opening_balance_date`, since it assumes every change
 * since then has been logged. For points *before* that anchor — where nothing
 * has necessarily been logged — the value is held flat at
 * `opening_balance_cents` rather than extrapolated, since we have no basis
 * to guess further back. Accounts with no anchor set fall back to the old
 * behavior: reconstruct all the way back using whatever transactions exist.
 *
 * Invested (holdings) value has no anchor concept — it's held flat at its
 * current value across the whole window, since there's no historical price
 * data to reconstruct from.
 */
export async function getNetWorthSeries(
  periods: number,
  granularity: NetWorthGranularity = 'month',
): Promise<{ date: string; value: number }[]> {
  const accounts = await listAccounts();
  const cashOwedAccounts = accounts.filter((a) => a.type !== 'invested');
  const investedTotal = accounts.filter((a) => a.type === 'invested').reduce((sum, a) => sum + a.balance_cents, 0);

  const now = new Date();
  const windowStart =
    granularity === 'month'
      ? new Date(now.getFullYear(), now.getMonth() - (periods - 1), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periods - 1));

  const { rows: txs } = await listTransactions({
    startDate: windowStart.toISOString().slice(0, 10),
    limit: 5000,
  });
  const txsByAccount = new Map<string, Transaction[]>();
  for (const tx of txs) {
    if (!txsByAccount.has(tx.account_id)) txsByAccount.set(tx.account_id, []);
    txsByAccount.get(tx.account_id)!.push(tx);
  }

  function cashOwedValueAt(account: Account, pointDate: Date, cutoff: Date): number {
    if (account.opening_balance_date && pointDate < new Date(account.opening_balance_date)) {
      const anchor = account.opening_balance_cents ?? 0;
      return account.type === 'owed' ? -anchor : anchor;
    }
    const direction = account.type === 'owed' ? 1 : -1;
    const accountTxs = txsByAccount.get(account.id) ?? [];
    const futureAmountSum = accountTxs
      .filter((tx) => new Date(tx.date) >= cutoff)
      .reduce((sum, tx) => sum + tx.amount_cents, 0);
    const reconstructedBalance = account.balance_cents - direction * futureAmountSum;
    return account.type === 'owed' ? -reconstructedBalance : reconstructedBalance;
  }

  const series: { date: string; value: number }[] = [];
  for (let i = periods - 1; i >= 0; i--) {
    let pointDate: Date;
    let cutoff: Date;
    let label: string;

    if (granularity === 'month') {
      pointDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      label = pointDate.toISOString().slice(0, 7);
    } else {
      pointDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      label = pointDate.toISOString().slice(0, 10);
    }

    const cashOwedTotal = cashOwedAccounts.reduce((sum, a) => sum + cashOwedValueAt(a, pointDate, cutoff), 0);

    series.push({ date: label, value: cashOwedTotal + investedTotal });
  }

  return series;
}