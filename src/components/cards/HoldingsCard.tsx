import { useState } from 'react';
import { Card } from '../primitives/Card';
import { Row } from '../primitives/Row';
import { Dialog } from '../primitives/Dialog';
import { HoldingForm } from '../forms/HoldingForm';
import { formatMoney } from '../../lib/money';
import type { Account, Holding } from '../../lib/types';

interface HoldingsCardProps {
  holdings: Holding[];
  accounts: Account[];
  onChanged: () => void;
}

export function HoldingsCard({ holdings, accounts, onChanged }: HoldingsCardProps) {
  const [dialogHolding, setDialogHolding] = useState<Holding | 'new' | null>(null);
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  function close() {
    setDialogHolding(null);
    onChanged();
  }

  const editingAccount =
    dialogHolding && dialogHolding !== 'new' ? accountById.get(dialogHolding.account_id) : undefined;

  return (
    <>
      <Card
        title="Holdings"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogHolding('new')}>
            + Add
          </button>
        }
      >
        {holdings.length === 0 && <p className="cardEmpty">No holdings yet.</p>}
        {holdings.map((h) => (
          <Row
            key={h.id}
            title={h.symbol}
            subtitle={`${accountById.get(h.account_id)?.name ?? ''} · ${h.quantity} sh`}
            trailing={formatMoney(h.institution_value_cents)}
            onEdit={() => setDialogHolding(h)}
          />
        ))}
      </Card>

      <Dialog open={dialogHolding !== null} onClose={close} title={dialogHolding === 'new' ? 'Add holding' : 'Edit holding'}>
        {dialogHolding && (
          <HoldingForm
            holding={dialogHolding === 'new' ? undefined : dialogHolding}
            currentAccountName={editingAccount?.name}
            currentAccountInstitution={editingAccount?.institution}
            onDone={close}
          />
        )}
      </Dialog>
    </>
  );
}