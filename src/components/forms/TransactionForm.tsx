import { useState, type FormEvent } from 'react';
import type { Account, Category, Transaction } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteTransaction, insertTransaction, updateTransaction } from '../../lib/repository';

interface TransactionFormProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
}

export function TransactionForm({ transaction, accounts, categories, onDone }: TransactionFormProps) {
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [accountId, setAccountId] = useState(transaction?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? categories[0]?.id ?? '');
  const [amount, setAmount] = useState(
    transaction ? centsToDollarsString(Math.abs(transaction.amount_cents)) : '',
  );
  const [direction, setDirection] = useState<'out' | 'in'>(
    transaction ? (transaction.amount_cents < 0 ? 'in' : 'out') : 'out',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cents = parseDollarsToCents(amount);
      const signedCents = direction === 'out' ? Math.abs(cents) : -Math.abs(cents);
      const input = {
        date,
        merchant,
        raw_text: null,
        account_id: accountId,
        category_id: categoryId || null,
        amount_cents: signedCents,
        is_ignored: false,
      };
      if (transaction) {
        await updateTransaction(transaction.id, input);
      } else {
        await insertTransaction(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    if (!confirm('Delete this transaction?')) return;
    setPending(true);
    try {
      await deleteTransaction(transaction.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="tx-merchant">Merchant</label>
        <input id="tx-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="tx-date">Date</label>
        <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="tx-account">Account</label>
        <select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tx-category">Category</label>
        <select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tx-direction">Direction</label>
        <select id="tx-direction" value={direction} onChange={(e) => setDirection(e.target.value as 'out' | 'in')}>
          <option value="out">Money out</option>
          <option value="in">Money in</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="tx-amount">Amount</label>
        <input
          id="tx-amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {transaction ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {transaction ? 'Save' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}
