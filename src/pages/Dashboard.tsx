import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Grid } from '../components/layout/Grid';
import { NetWorthPanel } from '../components/networth/NetWorthPanel';
import { RANGE_CONFIG, type NetWorthRange } from '../components/networth/ranges';
import { AccountsCard } from '../components/cards/AccountsCard';
import { HoldingsCard } from '../components/cards/HoldingsCard';
import { TransactionsCard } from '../components/cards/TransactionsCard';
import { BudgetsCard } from '../components/cards/BudgetsCard';
import { GoalsCard } from '../components/cards/GoalsCard';
import {
  getNetWorthSeries,
  listAccounts,
  listCategories,
  listCategoryGroups,
  listGoals,
  listHoldings,
  listTransactions,
} from '../lib/repository';
import type { Account, Category, CategoryGroup, Goal, Holding, Transaction } from '../lib/types';
import { netWorthContribution } from '../lib/types';

const RECENT_LIMIT = 8;

export function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [series, setSeries] = useState<{ date: string; value: number }[]>([]);
  const [range, setRange] = useState<NetWorthRange>('3M');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const now = new Date();
    const monthStart = `${now.toISOString().slice(0, 7)}-01`;
    const monthEnd = `${now.toISOString().slice(0, 7)}-31`;
    const rangeCfg = RANGE_CONFIG[range];

    const [accountsRes, holdingsRes, categoriesRes, groupsRes, goalsRes, recentRes, monthRes, seriesRes] =
      await Promise.all([
        listAccounts(),
        listHoldings(),
        listCategories(),
        listCategoryGroups(),
        listGoals(),
        listTransactions({ limit: RECENT_LIMIT }),
        listTransactions({ startDate: monthStart, endDate: monthEnd, limit: 500 }),
        getNetWorthSeries(rangeCfg.periods, rangeCfg.granularity),
      ]);

    setAccounts(accountsRes);
    setHoldings(holdingsRes);
    setCategories(categoriesRes);
    setGroups(groupsRes);
    setGoals(goalsRes);
    setRecent(recentRes.rows);
    setMonthTransactions(monthRes.rows);
    setSeries(seriesRes);
    setLoading(false);
  }, [range]);

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
      <NetWorthPanel current={netWorth} series={series} range={range} onRangeChange={setRange} />
      <Grid>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <BudgetsCard groups={groups} categories={categories} monthTransactions={monthTransactions} />
          <div className="hideOnMobile">
            <AccountsCard accounts={accounts} onChanged={load} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div className="hideOnMobile">
            <TransactionsCard transactions={recent} accounts={accounts} categories={categories} onChanged={load} />
          </div>
          <div className="hideOnMobile">
            <GoalsCard goals={goals} accounts={accounts} onChanged={load} />
          </div>
          <div className="hideOnMobile">
            <HoldingsCard holdings={holdings} accounts={accounts} onChanged={load} />
          </div>
        </div>
      </Grid>
    </Shell>
  );
}
