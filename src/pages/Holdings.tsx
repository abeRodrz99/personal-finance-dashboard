import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { HoldingsCard } from '../components/cards/HoldingsCard';
import { listAccounts, listHoldings } from '../lib/repository';
import type { Account, Holding } from '../lib/types';

export function Holdings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [accountsRes, holdingsRes] = await Promise.all([listAccounts(), listHoldings()]);
    setAccounts(accountsRes);
    setHoldings(holdingsRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell title="Holdings" showBack>
      {loading ? (
        <p style={{ color: 'var(--mid)' }}>Loading…</p>
      ) : (
        <HoldingsCard holdings={holdings} accounts={accounts} onChanged={load} />
      )}
    </Shell>
  );
}