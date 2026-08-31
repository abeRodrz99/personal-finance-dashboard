import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { GoalsCard } from '../components/cards/GoalsCard';
import { listAccounts, listGoals } from '../lib/repository';
import type { Account, Goal } from '../lib/types';

export function Goals() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [accountsRes, goalsRes] = await Promise.all([listAccounts(), listGoals()]);
    setAccounts(accountsRes);
    setGoals(goalsRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell title="Goals" showBack>
      {loading ? <p style={{ color: 'var(--mid)' }}>Loading…</p> : <GoalsCard goals={goals} accounts={accounts} onChanged={load} />}
    </Shell>
  );
}
