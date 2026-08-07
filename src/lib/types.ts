export type AccountType = 'cash' | 'invested' | 'owed';
export type CategoryKind = 'spending' | 'income' | 'transfer';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  type: AccountType;
  subtype: string | null;
  mask: string | null;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  kind: CategoryKind;
  monthly_limit_cents: number | null;
  is_uncategorized: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  raw_text: string | null;
  amount_cents: number; // positive = outflow, negative = inflow
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis_cents: number | null;
  institution_value_cents: number;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  month: string; // ISO yyyy-mm-01
  cash_cents: number;
  invested_cents: number;
  owed_cents: number;
}

export function isOutflow(tx: Pick<Transaction, 'amount_cents'>): boolean {
  return tx.amount_cents > 0;
}

export function isInflow(tx: Pick<Transaction, 'amount_cents'>): boolean {
  return tx.amount_cents < 0;
}

/** Cash and invested count positively toward net worth; owed counts negatively. */
export function netWorthContribution(account: Pick<Account, 'type' | 'balance_cents'>): number {
  return account.type === 'owed' ? -account.balance_cents : account.balance_cents;
}