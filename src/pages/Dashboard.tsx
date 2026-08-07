import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Grid } from '../components/layout/Grid';
import { NetWorthPanel } from '../components/networth/NetWorthPanel';
import { AccountsCard } from '../components/cards/AccountsCard';
import { HoldingsCard } from '../components/cards/HoldingsCard';
import { TransactionsCard } from '../components/cards/TransactionsCard';
import { BudgetsCard } from '../components/cards/BudgetsCard';
import {
  getNetWorthSeries,
  listAccounts,
  listCategories,
  listHoldings,
  listTransactions,
} from '../lib/repository';
import type { Account, Category, Holding, Transaction } from '../lib/types';
import { netWorthContribution } from '../lib/types';

const RECENT_LIMIT = 8;
const CHART_MONTHS = 12;

export function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [series, setSeries] = useState<{ month: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const now = new Date();
    const monthStart = `${now.toISOString().slice(0, 7)}-01`;
    const monthEnd = `${now.toISOString().slice(0, 7)}-31`;

    const [accountsRes, holdingsRes, categoriesRes, recentRes, monthRes, seriesRes] = await Promise.all([
      listAccounts(),
      listHoldings(),
      listCategories(),
      listTransactions({ limit: RECENT_LIMIT }),
      listTransactions({ startDate: monthStart, endDate: monthEnd, limit: 500 }),
      getNetWorthSeries(CHART_MONTHS),
    ]);

    setAccounts(accountsRes);
    setHoldings(holdingsRes);
    setCategories(categoriesRes);
    setRecent(recentRes.rows);
    setMonthTransactions(monthRes.rows);
    setSeries(seriesRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const netWorth = accounts.reduce((sum, a) => sum + netWorthContribution(a), 0);

  if (loading) {
    return (
      <Shell title="Finance">
        <p style={{ color: 'var(--mid)' }}>Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell title="Finance">
      <NetWorthPanel current={netWorth} series={series} />
      <Grid>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <BudgetsCard categories={categories} monthTransactions={monthTransactions} />
          <AccountsCard accounts={accounts} onChanged={load} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <TransactionsCard transactions={recent} accounts={accounts} categories={categories} onChanged={load} />
          <HoldingsCard holdings={holdings} accounts={accounts} onChanged={load} />
        </div>
      </Grid>
    </Shell>
  );
}
