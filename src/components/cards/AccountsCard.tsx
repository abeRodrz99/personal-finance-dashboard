import { useState } from 'react';
import { Card } from '../primitives/Card';
import { Row } from '../primitives/Row';
import { Dialog } from '../primitives/Dialog';
import { AccountForm } from '../forms/AccountForm';
import { formatMoney } from '../../lib/money';
import type { Account } from '../../lib/types';

interface AccountsCardProps {
  accounts: Account[];
  onChanged: () => void;
}

export function AccountsCard({ accounts, onChanged }: AccountsCardProps) {
  const [dialogAccount, setDialogAccount] = useState<Account | 'new' | null>(null);

  function close() {
    setDialogAccount(null);
    onChanged();
  }

  return (
    <>
      <Card
        title="Accounts"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogAccount('new')}>
            + Add
          </button>
        }
      >
        {accounts.length === 0 && <p className="cardEmpty">No accounts yet. Add your first one.</p>}
        {accounts.map((a) => (
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
          <AccountForm account={dialogAccount === 'new' ? undefined : dialogAccount} onDone={close} />
        )}
      </Dialog>
    </>
  );
}
