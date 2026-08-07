import { useState, type FormEvent } from 'react';
import type { Category, CategoryGroup, CategoryKind } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteCategory, insertCategory, updateCategory } from '../../lib/repository';

interface CategoryFormProps {
  category?: Category;
  groups: CategoryGroup[];
  defaultGroupId?: string;
  onDone: () => void;
}

export function CategoryForm({ category, groups, defaultGroupId, onDone }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'spending');
  const [groupId, setGroupId] = useState(category?.group_id ?? defaultGroupId ?? '');
  const [limit, setLimit] = useState(
    category?.monthly_limit_cents ? centsToDollarsString(category.monthly_limit_cents) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const locked = category?.is_uncategorized ?? false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const input = {
        name,
        kind,
        group_id: groupId || null,
        monthly_limit_cents: kind === 'spending' && limit ? parseDollarsToCents(limit) : null,
      };
      if (category) {
        await updateCategory(category.id, input);
      } else {
        await insertCategory(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!category) return;
    if (!confirm('Delete this category? Its transactions will move to Uncategorized.')) return;
    setPending(true);
    try {
      await deleteCategory(category.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="cat-name">Name</label>
        <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} disabled={locked} required />
      </div>
      {!locked && (
        <div className="field">
          <label htmlFor="cat-group">Group</label>
          <select id="cat-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="cat-kind">Kind</label>
        <select id="cat-kind" value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)} disabled={locked}>
          <option value="spending">Spending</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      {kind === 'spending' && (
        <div className="field">
          <label htmlFor="cat-limit">Monthly limit (optional)</label>
          <input
            id="cat-limit"
            inputMode="decimal"
            placeholder="No limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
      )}
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {category && !locked ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {category ? 'Save' : 'Add category'}
        </button>
      </div>
    </form>
  );
}