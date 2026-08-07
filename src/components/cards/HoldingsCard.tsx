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

  function close() {
    setDialogHolding(null);
    onChanged();
  }

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
            subtitle={`${h.quantity} sh`}
            trailing={formatMoney(h.institution_value_cents)}
            onEdit={() => setDialogHolding(h)}
          />
        ))}
      </Card>

      <Dialog open={dialogHolding !== null} onClose={close} title={dialogHolding === 'new' ? 'Add holding' : 'Edit holding'}>
        {dialogHolding && (
          <HoldingForm holding={dialogHolding === 'new' ? undefined : dialogHolding} accounts={accounts} onDone={close} />
        )}
      </Dialog>
    </>
  );
}
