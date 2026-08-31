import { useState, type FormEvent } from 'react';
import type { Account, AccountType } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteAccount, insertAccount, updateAccount } from '../../lib/repository';
import { useConfirm } from '../../contexts/ConfirmContext';

interface AccountFormProps {
  account?: Account;
  defaultType?: AccountType;
  onDone: () => void;
}

export function AccountForm({ account, defaultType, onDone }: AccountFormProps) {
  const confirmDialog = useConfirm();
  const [name, setName] = useState(account?.name ?? '');
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? defaultType ?? 'cash');
  const [balance, setBalance] = useState(account ? centsToDollarsString(account.balance_cents) : '');
  const [mask, setMask] = useState(account?.mask ?? '');
  const [showBackfill, setShowBackfill] = useState(
    Boolean(account?.opening_balance_date || account?.opening_balance_cents),
  );
  const [openingDate, setOpeningDate] = useState(account?.opening_balance_date ?? '');
  const [openingBalance, setOpeningBalance] = useState(
    account?.opening_balance_cents !== null && account?.opening_balance_cents !== undefined
      ? centsToDollarsString(account.opening_balance_cents)
      : '',
  );
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
        opening_balance_date: showBackfill && openingDate ? openingDate : null,
        opening_balance_cents: showBackfill && openingDate && openingBalance ? parseDollarsToCents(openingBalance) : null,
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
    if (!(await confirmDialog('Delete this account and all its transactions and holdings?'))) return;
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
      <div className="fieldRow">
        <div className="field">
          <label htmlFor="acc-name">Name</label>
          <input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="acc-institution">Institution</label>
          <input id="acc-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="fieldRow">
        <div className="field">
          <label htmlFor="acc-type">Type</label>
          <select id="acc-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            <option value="cash">Bank account</option>
            <option value="owed">Credit card / loan</option>
            {account?.type === 'invested' && <option value="invested">Investment (via Holdings)</option>}
          </select>
        </div>
        <div className="field">
          <label htmlFor="acc-balance">Balance (today)</label>
          <input
            id="acc-balance"
            inputMode="decimal"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="acc-mask">Last 4 digits (optional)</label>
        <input id="acc-mask" maxLength={4} value={mask} onChange={(e) => setMask(e.target.value)} placeholder="••••" />
      </div>

      {!showBackfill ? (
        <button type="button" className="fieldLinkBtn" onClick={() => setShowBackfill(true)}>
          Backfilling history? Set a starting balance
        </button>
      ) : (
        <div className="backfillSection">
          <div className="backfillHeader">
            <span>Starting balance</span>
            <button type="button" className="fieldLinkBtn" onClick={() => setShowBackfill(false)}>
              Remove
            </button>
          </div>
          <p className="fieldHint">
            Tells the net worth chart what this account was actually worth on a given date, instead of
            assuming today's balance stretches all the way back.
          </p>
          <div className="fieldRow">
            <div className="field">
              <label htmlFor="acc-opening-date">As of date</label>
              <input
                id="acc-opening-date"
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="acc-opening-balance">Balance then</label>
              <input
                id="acc-opening-balance"
                inputMode="decimal"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

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