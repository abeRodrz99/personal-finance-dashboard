import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { AccountsCard } from '../components/cards/AccountsCard';
import { listAccounts } from '../lib/repository';
import type { Account } from '../lib/types';

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setAccounts(await listAccounts());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell title="Accounts" showBack>
      {loading ? <p style={{ color: 'var(--mid)' }}>Loading…</p> : <AccountsCard accounts={accounts} onChanged={load} />}
    </Shell>
  );
}
