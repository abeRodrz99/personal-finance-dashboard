import { useState } from 'react';
import { Card } from '../primitives/Card';
import { Row } from '../primitives/Row';
import { Dialog } from '../primitives/Dialog';
import { AccountForm } from '../forms/AccountForm';
import { formatMoney } from '../../lib/money';
import type { Account, AccountType } from '../../lib/types';

interface AccountsCardProps {
  accounts: Account[];
  onChanged: () => void;
}

type Tab = Exclude<AccountType, never>;

const TABS: { key: Tab; label: string }[] = [
  { key: 'cash', label: 'Bank Accounts' },
  { key: 'owed', label: 'Credit Cards' },
  { key: 'invested', label: 'Investments' },
];

export function AccountsCard({ accounts, onChanged }: AccountsCardProps) {
  const [tab, setTab] = useState<Tab>('cash');
  const [dialogAccount, setDialogAccount] = useState<Account | 'new' | null>(null);

  const visibleAccounts = accounts.filter((a) => a.type === tab);

  function close() {
    setDialogAccount(null);
    onChanged();
  }

  return (
    <>
      <Card
        title="Accounts"
        actions={
          tab !== 'invested' ? (
            <button type="button" className="cardAddBtn" onClick={() => setDialogAccount('new')}>
              + Add
            </button>
          ) : undefined
        }
      >
        <div className="tabSwitch">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`tabSwitchBtn${tab === t.key ? ' tabSwitchBtnActive' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {visibleAccounts.length === 0 && tab !== 'invested' && (
          <p className="cardEmpty">No accounts here yet. Add your first one.</p>
        )}
        {visibleAccounts.length === 0 && tab === 'invested' && (
          <p className="cardEmpty">No investment accounts yet — add a holding to create one.</p>
        )}
        {visibleAccounts.map((a) => (
          <Row
            key={a.id}
            title={a.name}
            subtitle={[a.institution, a.mask ? `••${a.mask}` : null].filter(Boolean).join(' · ')}
            trailing={formatMoney(a.type === 'owed' ? -a.balance_cents : a.balance_cents)}
            onEdit={() => setDialogAccount(a)}
          />
        ))}
      </Card>

      <Dialog
        open={dialogAccount !== null}
        onClose={close}
        title={dialogAccount === 'new' ? 'Add account' : 'Edit account'}
      >
        {dialogAccount && (
          <AccountForm
            account={dialogAccount === 'new' ? undefined : dialogAccount}
            defaultType={tab === 'invested' ? 'cash' : tab}
            onDone={close}
          />
        )}
      </Dialog>
    </>
  );
}
