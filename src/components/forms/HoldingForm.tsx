import { useState, type FormEvent } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Holding } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteHolding, findOrCreateInvestedAccount, insertHolding, updateHolding } from '../../lib/repository';

interface HoldingFormProps {
  holding?: Holding;
  currentAccountName?: string;
  currentAccountInstitution?: string | null;
  onDone: () => void;
}

export function HoldingForm({ holding, currentAccountName, currentAccountInstitution, onDone }: HoldingFormProps) {
  const confirmDialog = useConfirm();
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [accountName, setAccountName] = useState(currentAccountName ?? '');
  const [institution, setInstitution] = useState(currentAccountInstitution ?? '');
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [value, setValue] = useState(holding ? centsToDollarsString(holding.institution_value_cents) : '');
  const [showBackfill, setShowBackfill] = useState(Boolean(holding?.opening_date || holding?.opening_value_cents));
  const [openingDate, setOpeningDate] = useState(holding?.opening_date ?? '');
  const [openingValue, setOpeningValue] = useState(
    holding?.opening_value_cents !== null && holding?.opening_value_cents !== undefined
      ? centsToDollarsString(holding.opening_value_cents)
      : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const account = await findOrCreateInvestedAccount(accountName, institution || null);
      const input = {
        symbol: symbol.toUpperCase(),
        name: name || null,
        account_id: account.id,
        quantity: Number.parseFloat(quantity) || 0,
        cost_basis_cents: null,
        institution_value_cents: parseDollarsToCents(value),
        opening_date: showBackfill && openingDate ? openingDate : null,
        opening_value_cents: showBackfill && openingDate && openingValue ? parseDollarsToCents(openingValue) : null,
      };
      if (holding) {
        await updateHolding(holding.id, input);
      } else {
        await insertHolding(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!holding) return;
    if (!(await confirmDialog('Delete this holding?'))) return;
    setPending(true);
    try {
      await deleteHolding(holding.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="h-symbol">Symbol</label>
        <input id="h-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="h-name">Name (optional)</label>
        <input id="h-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="h-account">Account (e.g. "401K", "Brokerage")</label>
        <input id="h-account" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="h-institution">Institution (optional)</label>
        <input id="h-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="h-quantity">Quantity</label>
        <input
          id="h-quantity"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="h-value">Current value</label>
        <input
          id="h-value"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
      </div>

      <div className="fieldCheckbox">
        <label htmlFor="h-backfill-toggle">
          <input
            id="h-backfill-toggle"
            type="checkbox"
            checked={showBackfill}
            onChange={(e) => setShowBackfill(e.target.checked)}
          />
          Backfilling history? Set a starting value
        </label>
      </div>

      {showBackfill && (
        <>
          <p className="fieldHint">
            Tells the net worth chart what this holding was worth on a given date. Before this date the
            chart shows this value flat; from this date forward it uses the current value above.
          </p>
          <div className="field">
            <label htmlFor="h-opening-date">As of date</label>
            <input
              id="h-opening-date"
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="h-opening-value">Value on that date</label>
            <input
              id="h-opening-value"
              inputMode="decimal"
              placeholder="0.00"
              value={openingValue}
              onChange={(e) => setOpeningValue(e.target.value)}
            />
          </div>
        </>
      )}

      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {holding ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {holding ? 'Save' : 'Add holding'}
        </button>
      </div>
    </form>
  );
}
