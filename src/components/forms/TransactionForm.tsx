import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Account, Category, Transaction } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteTransaction, insertTransaction, updateTransaction } from '../../lib/repository';
import './TransactionForm.css';

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
    transaction ? (transaction.amount_cents < 0 ? 'out' : 'in') : 'out',
  );
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const accountsByType = {
    cash: accounts.filter((a) => a.type === 'cash'),
    invested: accounts.filter((a) => a.type === 'invested'),
    owed: accounts.filter((a) => a.type === 'owed'),
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    setPending(true);
    try {
      const cents = parseDollarsToCents(amount);
      const signedCents = direction === 'out' ? -Math.abs(cents) : Math.abs(cents);

      // Clean payload: Omit raw_text and ensure category_id is undefined/null clean
      const input = {
        date,
        merchant: merchant.trim(),
        account_id: accountId,
        category_id: categoryId ? categoryId : null,
        amount_cents: signedCents,
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
          {accountsByType.cash.length > 0 && (
            <optgroup label="💰 Cash">
              {accountsByType.cash.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          )}
          {accountsByType.invested.length > 0 && (
            <optgroup label="📈 Invested">
              {accountsByType.invested.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          )}
          {accountsByType.owed.length > 0 && (
            <optgroup label="💳 Credit Cards & Loans">
              {accountsByType.owed.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="field">
        <label htmlFor="tx-category-search">Category</label>
        <div className="categorySelector" ref={dropdownRef}>
          <input
            id="tx-category-search"
            type="text"
            placeholder="Search or type to filter..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            onFocus={() => setShowCategoryDropdown(true)}
            className="categoryInput"
          />
          {showCategoryDropdown && (
            <div className="categoryDropdown">
              {filteredCategories.length === 0 ? (
                <div className="categoryEmpty">No categories found</div>
              ) : (
                filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`categoryOption${categoryId === c.id ? ' categoryOptionSelected' : ''}`}
                    onClick={() => {
                      setCategoryId(c.id);
                      setCategorySearch(c.name);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <div className="categoryOptionContent">
                      <span className="categoryName">{c.name}</span>
                      <span className="categoryKind">{c.kind}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          {!showCategoryDropdown && selectedCategory && (
            <div className="categorySelected">
              <span className="categoryName">{selectedCategory.name}</span>
              <span className="categoryKind">{selectedCategory.kind}</span>
            </div>
          )}
        </div>
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