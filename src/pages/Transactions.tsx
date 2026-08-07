import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/primitives/Card';
import { Row } from '../components/primitives/Row';
import { Dialog } from '../components/primitives/Dialog';
import { TransactionForm } from '../components/forms/TransactionForm';
import { formatMoney } from '../lib/money';
import { listAccounts, listCategories, listTransactions } from '../lib/repository';
import type { Account, Category, Transaction } from '../lib/types';
import './Transactions.css';

const PAGE_SIZE = 20;

export function Transactions() {
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [dialogTx, setDialogTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const accountId = params.get('account') ?? '';
  const categoryId = params.get('category') ?? '';
  const direction = (params.get('direction') as 'in' | 'out' | '') ?? '';
  const search = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1');

  const load = useCallback(async () => {
    setLoading(true);
    const [accountsRes, categoriesRes, txRes] = await Promise.all([
      listAccounts(),
      listCategories(),
      listTransactions({
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        direction: direction || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    ]);
    setAccounts(accountsRes);
    setCategories(categoriesRes);
    setRows(txRes.rows);
    setTotal(txRes.count);
    setLoading(false);
  }, [accountId, categoryId, direction, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filteredTotal = rows.reduce((sum, r) => sum + r.amount_cents, 0);

  return (
    <Shell title="Transactions" showBack>
      <Card title={`${total} transactions`}>
        <div className="txFilters">
          <input
            className="txSearch"
            placeholder="Search merchant…"
            defaultValue={search}
            onChange={(e) => updateParam('q', e.target.value)}
          />
          <select value={accountId} onChange={(e) => updateParam('account', e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select value={categoryId} onChange={(e) => updateParam('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={direction} onChange={(e) => updateParam('direction', e.target.value)}>
            <option value="">In &amp; out</option>
            <option value="out">Money out</option>
            <option value="in">Money in</option>
          </select>
        </div>

        {!loading && (
          <p className="txTotal tabular">
            Filtered total: {formatMoney(filteredTotal, { sign: true })}
          </p>
        )}

        {loading && <p className="cardEmpty">Loading…</p>}
        {!loading && rows.length === 0 && <p className="cardEmpty">No transactions match these filters.</p>}
        {rows.map((tx) => (
          <Row
            key={tx.id}
            title={tx.merchant}
            subtitle={`${accountById.get(tx.account_id)?.name ?? ''} · ${tx.date}`}
            trailing={
              <span style={{ color: tx.amount_cents < 0 ? 'var(--up)' : undefined }}>
                {formatMoney(tx.amount_cents, { sign: true })}
              </span>
            }
            onEdit={() => setDialogTx(tx)}
          />
        ))}

        {totalPages > 1 && (
          <div className="txPagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParam('page', String(page - 1))}
            >
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateParam('page', String(page + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </Card>

      <Dialog open={dialogTx !== null} onClose={() => { setDialogTx(null); load(); }} title="Edit transaction">
        {dialogTx && (
          <TransactionForm
            transaction={dialogTx}
            accounts={accounts}
            categories={categories}
            onDone={() => { setDialogTx(null); load(); }}
          />
        )}
      </Dialog>
    </Shell>
  );
}
