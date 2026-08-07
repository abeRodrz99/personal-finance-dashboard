import { Link } from 'react-router-dom';
import { Card } from '../primitives/Card';
import { formatMoney } from '../../lib/money';
import type { Category, Transaction } from '../../lib/types';
import './BudgetsCard.css';

interface BudgetsCardProps {
  categories: Category[];
  monthTransactions: Transaction[];
}

export function BudgetsCard({ categories, monthTransactions }: BudgetsCardProps) {
  const spendingCategories = categories.filter((c) => c.kind === 'spending');

  const spentByCategory = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (tx.amount_cents <= 0 || !tx.category_id) continue; // only outflows count as spending
    spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + tx.amount_cents);
  }

  const rows = spendingCategories
    .map((c) => ({ category: c, spent: spentByCategory.get(c.id) ?? 0 }))
    .filter((r) => r.spent > 0 || r.category.monthly_limit_cents)
    .sort((a, b) => b.spent - a.spent);

  return (
    <Card
      title="Spending"
      actions={
        <Link to="/categories" className="cardAddBtn">
          Categories
        </Link>
      }
    >
      {rows.length === 0 && <p className="cardEmpty">No spending logged this month yet.</p>}
      {rows.map(({ category, spent }) => {
        const limit = category.monthly_limit_cents;
        const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
        const over = limit !== null && limit !== undefined && spent > limit;
        return (
          <div key={category.id} className="budgetRow">
            <div className="budgetRowHeader">
              <span className="budgetRowName">{category.name}</span>
              <span className="budgetRowAmount tabular">
                {formatMoney(spent)}
                {limit ? ` / ${formatMoney(limit)}` : ' · no limit'}
              </span>
            </div>
            <div className="budgetTrack">
              <div
                className={`budgetFill${over ? ' budgetFillOver' : ''}${!limit ? ' budgetFillDashed' : ''}`}
                style={{ width: limit ? `${pct}%` : '100%' }}
              />
            </div>
          </div>
        );
      })}
    </Card>
  );
}
