import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../primitives/Card';
import { formatMoney } from '../../lib/money';
import type { Category, CategoryGroup, Transaction } from '../../lib/types';
import './BudgetsCard.css';

interface BudgetsCardProps {
  groups: CategoryGroup[];
  categories: Category[];
  monthTransactions: Transaction[];
}

export function BudgetsCard({ groups, categories, monthTransactions }: BudgetsCardProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(groupId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const spentByCategory = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (tx.amount_cents <= 0 || !tx.category_id || tx.is_ignored) continue; // only outflows count as spending
    spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + tx.amount_cents);
  }

  const spendingCategories = categories.filter((c) => c.kind === 'spending');

  const sections = groups
    .map((group) => {
      const groupCategories = spendingCategories
        .filter((c) => c.group_id === group.id)
        .map((c) => ({ category: c, spent: spentByCategory.get(c.id) ?? 0 }))
        .filter((r) => r.spent > 0 || r.category.monthly_limit_cents);
      const groupTotal = groupCategories.reduce((sum, r) => sum + r.spent, 0);
      return { group, rows: groupCategories, total: groupTotal };
    })
    .filter((s) => s.rows.length > 0 || s.group.monthly_limit_cents);

  const ungroupedRows = spendingCategories
    .filter((c) => !c.group_id)
    .map((c) => ({ category: c, spent: spentByCategory.get(c.id) ?? 0 }))
    .filter((r) => r.spent > 0 || r.category.monthly_limit_cents);

  const nothingToShow = sections.length === 0 && ungroupedRows.length === 0;

  return (
    <Card
      title="Spending"
      actions={
        <Link to="/categories" className="cardAddBtn">
          Categories
        </Link>
      }
    >
      {nothingToShow && <p className="cardEmpty">No spending logged this month yet.</p>}

      {sections.map(({ group, rows, total }) => {
        const isOpen = expanded.has(group.id);
        return (
          <div key={group.id} className="budgetGroup">
            <button type="button" className="budgetGroupHeaderRow" onClick={() => toggle(group.id)}>
              <span className="budgetGroupChevron">{isOpen ? '▾' : '▸'}</span>
              <span className="budgetGroupName">{group.name}</span>
              <span className="budgetGroupAmount tabular">
                {formatMoney(total)}
                {group.monthly_limit_cents ? ` / ${formatMoney(group.monthly_limit_cents)}` : ''}
              </span>
            </button>
            {group.monthly_limit_cents && <GroupBar spent={total} limit={group.monthly_limit_cents} />}
            {isOpen && (
              <div className="budgetGroupCategories">
                {rows.map(({ category, spent }) => (
                  <BudgetRow key={category.id} name={category.name} spent={spent} limit={category.monthly_limit_cents} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {ungroupedRows.length > 0 && (
        <div className="budgetGroup">
          {sections.length > 0 && (
            <button type="button" className="budgetGroupHeaderRow" onClick={() => toggle('__ungrouped')}>
              <span className="budgetGroupChevron">{expanded.has('__ungrouped') ? '▾' : '▸'}</span>
              <span className="budgetGroupName">Ungrouped</span>
            </button>
          )}
          {(sections.length === 0 || expanded.has('__ungrouped')) && (
            <div className="budgetGroupCategories">
              {ungroupedRows.map(({ category, spent }) => (
                <BudgetRow key={category.id} name={category.name} spent={spent} limit={category.monthly_limit_cents} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GroupBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min(100, (spent / limit) * 100);
  const over = spent > limit;
  return (
    <div className="budgetTrack budgetTrackGroup">
      <div className={`budgetFill budgetFillGroup${over ? ' budgetFillOver' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function BudgetRow({ name, spent, limit }: { name: string; spent: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
  const over = limit !== null && limit !== undefined && spent > limit;
  return (
    <div className="budgetRow">
      <div className="budgetRowHeader">
        <span className="budgetRowName">{name}</span>
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
}
