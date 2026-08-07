import { useState, type FormEvent } from 'react';
import type { Account, Holding } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteHolding, insertHolding, updateHolding } from '../../lib/repository';

interface HoldingFormProps {
  holding?: Holding;
  accounts: Account[];
  onDone: () => void;
}

export function HoldingForm({ holding, accounts, onDone }: HoldingFormProps) {
  const investedAccounts = accounts.filter((a) => a.type === 'invested');
  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [accountId, setAccountId] = useState(holding?.account_id ?? investedAccounts[0]?.id ?? '');
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [value, setValue] = useState(holding ? centsToDollarsString(holding.institution_value_cents) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const input = {
        symbol: symbol.toUpperCase(),
        name: name || null,
        account_id: accountId,
        quantity: Number.parseFloat(quantity) || 0,
        cost_basis_cents: null,
        institution_value_cents: parseDollarsToCents(value),
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
    if (!confirm('Delete this holding?')) return;
    setPending(true);
    try {
      await deleteHolding(holding.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  if (investedAccounts.length === 0) {
    return <p className="formError">Add an "invested" type account first.</p>;
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
        <label htmlFor="h-account">Account</label>
        <select id="h-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {investedAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
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
