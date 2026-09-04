import { useState, type FormEvent } from 'react';
import type { Account, Category, Transaction } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import {
  deleteTransaction,
  insertTransaction,
  insertTransfer,
  updateTransaction,
  deleteTransferGroup,
} from '../../lib/repository';

interface TransactionFormProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
  onSplit?: () => void; 
}

export function TransactionForm({ transaction, accounts, categories, onDone, onSplit }: TransactionFormProps) {
  const isTransfer = !!transaction?.transfer_group_id;
  const [mode, setMode] = useState<'expense' | 'transfer'>(isTransfer ? 'transfer' : 'expense');

  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(
    transaction ? centsToDollarsString(Math.abs(transaction.amount_cents)) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // expense/income fields
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [accountId, setAccountId] = useState(transaction?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? categories[0]?.id ?? '');
  const [direction, setDirection] = useState<'out' | 'in'>(
    transaction ? (transaction.amount_cents < 0 ? 'in' : 'out') : 'out',
  );

  // transfer fields
  const [fromAccountId, setFromAccountId] = useState(
    isTransfer
      ? transaction!.amount_cents > 0
        ? transaction!.account_id
        : (transaction!.transfer_account_id ?? accounts[0]?.id ?? '')
      : accounts[0]?.id ?? '',
  );
  const [toAccountId, setToAccountId] = useState(
    isTransfer
      ? transaction!.amount_cents > 0
        ? (transaction!.transfer_account_id ?? accounts[0]?.id ?? '')
        : transaction!.account_id
      : accounts[1]?.id ?? accounts[0]?.id ?? '',
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'transfer') {
        const amountCents = parseDollarsToCents(amount);
        if (isTransfer) {
          await deleteTransferGroup(transaction!.transfer_group_id!);
        }
        await insertTransfer({ date, fromAccountId, toAccountId, amountCents });
      } else {
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
            split_parent_id: null,
            transfer_group_id: null,
            transfer_account_id: null,
        };
        if (transaction) {
          await updateTransaction(transaction.id, input);
        } else {
          await insertTransaction(input);
        }
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
    if (!confirm(isTransfer ? 'Delete this transfer?' : 'Delete this transaction?')) return;
    setPending(true);
    try {
      await deleteTransaction(transaction.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  const sameAccount = mode === 'transfer' && fromAccountId === toAccountId;

  return (
    <form onSubmit={handleSubmit}>
      {!transaction && (
        <div className="field">
          <label htmlFor="tx-mode">Type</label>
          <select id="tx-mode" value={mode} onChange={(e) => setMode(e.target.value as 'expense' | 'transfer')}>
            <option value="expense">Expense / Income</option>
            <option value="transfer">Transfer / Payment</option>
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="tx-date">Date</label>
        <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {mode === 'transfer' ? (
        <>
          <div className="field">
            <label htmlFor="tx-from">From account</label>
            <select id="tx-from" value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tx-to">To account</label>
            <select id="tx-to" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
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
          {sameAccount && <p className="formError">Pick two different accounts.</p>}
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="tx-merchant">Merchant</label>
            <input id="tx-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} required />
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
        </>
      )}

      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {transaction ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        {transaction && !isTransfer && onSplit && (
          <button type="button" className="btnGhost" onClick={onSplit} disabled={pending}>
            Split
          </button>
        )}
        <button type="submit" className="btnPrimary" disabled={pending || sameAccount}>
          {transaction ? 'Save' : mode === 'transfer' ? 'Add transfer' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}