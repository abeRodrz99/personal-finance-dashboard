import { useState, type FormEvent } from 'react';
import type { Account, AccountType } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteAccount, insertAccount, updateAccount } from '../../lib/repository';

interface AccountFormProps {
  account?: Account;
  onDone: () => void;
}

export function AccountForm({ account, onDone }: AccountFormProps) {
  const [name, setName] = useState(account?.name ?? '');
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'cash');
  const [balance, setBalance] = useState(account ? centsToDollarsString(account.balance_cents) : '');
  const [mask, setMask] = useState(account?.mask ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const input = {
        name,
        institution: institution || null,
        type,
        subtype: null,
        mask: mask || null,
        balance_cents: parseDollarsToCents(balance),
      };
      if (account) {
        await updateAccount(account.id, input);
      } else {
        await insertAccount(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    if (!confirm('Delete this account and all its transactions and holdings?')) return;
    setPending(true);
    try {
      await deleteAccount(account.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="acc-name">Name</label>
        <input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="acc-institution">Institution</label>
        <input id="acc-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="acc-type">Type</label>
        <select id="acc-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          <option value="cash">Cash</option>
          <option value="owed">Owed (credit card, loan)</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="acc-balance">Balance</label>
        <input
          id="acc-balance"
          inputMode="decimal"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="acc-mask">Last 4 digits (optional)</label>
        <input id="acc-mask" maxLength={4} value={mask} onChange={(e) => setMask(e.target.value)} />
      </div>
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {account ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {account ? 'Save' : 'Add account'}
        </button>
      </div>
    </form>
  );
}