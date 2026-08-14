import { useState, type FormEvent } from 'react';
import type { CategoryGroup } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteCategoryGroup, insertCategoryGroup, updateCategoryGroup } from '../../lib/repository';

interface GroupFormProps {
  group?: CategoryGroup;
  onDone: () => void;
}

export function GroupForm({ group, onDone }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [limit, setLimit] = useState(
    group?.monthly_limit_cents ? centsToDollarsString(group.monthly_limit_cents) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const limitCents = limit ? parseDollarsToCents(limit) : null;
      if (group) {
        await updateCategoryGroup(group.id, name, limitCents);
      } else {
        await insertCategoryGroup(name, limitCents);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!group) return;
    if (!confirm('Delete this group? Its categories stay, just ungrouped.')) return;
    setPending(true);
    try {
      await deleteCategoryGroup(group.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="grp-name">Group name (e.g. "Essentials")</label>
        <input id="grp-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="grp-limit">Monthly budget for this group (optional)</label>
        <input
          id="grp-limit"
          inputMode="decimal"
          placeholder="No limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
      </div>
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {group ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {group ? 'Save' : 'Add group'}
        </button>
      </div>
    </form>
  );
}