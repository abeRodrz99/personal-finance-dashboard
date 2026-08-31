import { useState, type FormEvent } from 'react';
import type { Category, Transaction } from '../../lib/types';
import { centsToDollarsString, formatMoney, parseDollarsToCents } from '../../lib/money';
import { splitTransaction, type SplitPiece } from '../../lib/repository';

interface SplitRow {
  merchant: string;
  categoryId: string;
  amount: string;
}

interface SplitTransactionFormProps {
  transaction: Transaction;
  categories: Category[];
  onDone: () => void;
  onCancel: () => void;
}

export function SplitTransactionForm({ transaction, categories, onDone, onCancel }: SplitTransactionFormProps) {
  const originalAbs = Math.abs(transaction.amount_cents);
  const isOutflow = transaction.amount_cents > 0;

  const [rows, setRows] = useState<SplitRow[]>([
    { merchant: transaction.merchant, categoryId: transaction.category_id ?? '', amount: centsToDollarsString(originalAbs) },
    { merchant: transaction.merchant, categoryId: transaction.category_id ?? '', amount: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const enteredTotalCents = rows.reduce((sum, r) => sum + parseDollarsToCents(r.amount || '0'), 0);
  const remainingCents = originalAbs - enteredTotalCents;
  const matches = remainingCents === 0;

  function updateRow(index: number, patch: Partial<SplitRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { merchant: transaction.merchant, categoryId: transaction.category_id ?? '', amount: '' },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!matches) {
      setError(`Pieces must add up to the original ${formatMoney(originalAbs)}.`);
      return;
    }
    if (rows.some((r) => !r.merchant.trim())) {
      setError('Every piece needs a merchant name.');
      return;
    }
    setPending(true);
    try {
      const pieces: SplitPiece[] = rows.map((r) => ({
        merchant: r.merchant,
        category_id: r.categoryId || null,
        amount_cents: isOutflow ? parseDollarsToCents(r.amount || '0') : -parseDollarsToCents(r.amount || '0'),
      }));
      await splitTransaction(transaction.id, pieces);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="fieldHint">
        Splitting {formatMoney(transaction.amount_cents, { sign: true })} from "{transaction.merchant}" into
        multiple pieces. Each piece becomes its own transaction with its own category.
      </p>

      {rows.map((row, i) => (
        <div key={i} className="splitRow">
          <div className="splitRowFields">
            <div className="field">
              <label htmlFor={`split-merchant-${i}`}>Merchant</label>
              <input
                id={`split-merchant-${i}`}
                value={row.merchant}
                onChange={(e) => updateRow(i, { merchant: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`split-category-${i}`}>Category</label>
              <select
                id={`split-category-${i}`}
                value={row.categoryId}
                onChange={(e) => updateRow(i, { categoryId: e.target.value })}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`split-amount-${i}`}>Amount</label>
              <input
                id={`split-amount-${i}`}
                inputMode="decimal"
                placeholder="0.00"
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
                required
              />
            </div>
          </div>
          {rows.length > 2 && (
            <button
              type="button"
              className="splitRemoveBtn"
              onClick={() => removeRow(i)}
              aria-label="Remove this piece"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      <button type="button" className="splitAddBtn" onClick={addRow}>
        + Add another piece
      </button>

      <div className={`splitTotal${!matches ? ' splitTotalMismatch' : ''}`}>
        <span>Remaining to assign</span>
        <span className="tabular">{formatMoney(remainingCents)}</span>
      </div>

      {error && <p className="formError">{error}</p>}

      <div className="formActions">
        <button type="button" className="btnGhost" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="btnPrimary" disabled={pending || !matches}>
          Split into {rows.length}
        </button>
      </div>
    </form>
  );
}