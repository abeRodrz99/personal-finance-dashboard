import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../primitives/Card';
import { Row } from '../primitives/Row';
import { Dialog } from '../primitives/Dialog';
import { TransactionForm } from '../forms/TransactionForm';
import { formatMoney } from '../../lib/money';
import type { Account, Category, Transaction } from '../../lib/types';

interface TransactionsCardProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onChanged: () => void;
}

export function TransactionsCard({ transactions, accounts, categories, onChanged }: TransactionsCardProps) {
  const [dialogTx, setDialogTx] = useState<Transaction | 'new' | null>(null);
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  function close() {
    setDialogTx(null);
    onChanged();
  }

  return (
    <>
      <Card
        title="Recent"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogTx('new')}>
            + Add
          </button>
        }
      >
        {transactions.length === 0 && <p className="cardEmpty">No transactions yet.</p>}
        {transactions.map((tx) => (
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
        <Link to="/transactions" className="cardFooterLink">
          See all transactions →
        </Link>
      </Card>

      <Dialog open={dialogTx !== null} onClose={close} title={dialogTx === 'new' ? 'Add transaction' : 'Edit transaction'}>
        {dialogTx && accounts.length > 0 && (
          <TransactionForm
            transaction={dialogTx === 'new' ? undefined : dialogTx}
            accounts={accounts}
            categories={categories}
            onDone={close}
          />
        )}
        {dialogTx && accounts.length === 0 && (
          <p className="formError">Add an account first before logging transactions.</p>
        )}
      </Dialog>
    </>
  );
}
