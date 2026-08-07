import { useState, type FormEvent } from 'react';
import type { CategoryGroup } from '../../lib/types';
import { deleteCategoryGroup, insertCategoryGroup, updateCategoryGroup } from '../../lib/repository';

interface GroupFormProps {
  group?: CategoryGroup;
  onDone: () => void;
}

export function GroupForm({ group, onDone }: GroupFormProps) {
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (group) {
        await updateCategoryGroup(group.id, name);
      } else {
        await insertCategoryGroup(name);
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