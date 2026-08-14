import { useState, type FormEvent } from 'react';
import type { Account, Goal } from '../../lib/types';
import { centsToDollarsString, parseDollarsToCents } from '../../lib/money';
import { deleteGoal, insertGoal, updateGoal } from '../../lib/repository';

interface GoalFormProps {
  goal?: Goal;
  accounts: Account[];
  onDone: () => void;
}

export function GoalForm({ goal, accounts, onDone }: GoalFormProps) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? centsToDollarsString(goal.target_cents) : '');
  const [linkedAccountId, setLinkedAccountId] = useState(goal?.linked_account_id ?? '');
  const [current, setCurrent] = useState(goal && !goal.linked_account_id ? centsToDollarsString(goal.current_cents) : '');
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Non-owed accounts only — a goal tracking "pay off this card" doesn't fit
  // the same progress-bar-fills-up model as a savings goal.
  const linkableAccounts = accounts.filter((a) => a.type !== 'owed');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const input = {
        name,
        target_cents: parseDollarsToCents(target),
        linked_account_id: linkedAccountId || null,
        current_cents: linkedAccountId ? 0 : parseDollarsToCents(current || '0'),
        target_date: targetDate || null,
      };
      if (goal) {
        await updateGoal(goal.id, input);
      } else {
        await insertGoal(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    if (!confirm('Delete this goal?')) return;
    setPending(true);
    try {
      await deleteGoal(goal.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="goal-name">Name (e.g. "Emergency Fund")</label>
        <input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="goal-target">Target amount</label>
        <input
          id="goal-target"
          inputMode="decimal"
          placeholder="0.00"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="goal-account">Track automatically from an account (optional)</label>
        <select id="goal-account" value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}>
          <option value="">Track manually instead</option>
          {linkableAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {!linkedAccountId && (
        <div className="field">
          <label htmlFor="goal-current">Current amount saved</label>
          <input
            id="goal-current"
            inputMode="decimal"
            placeholder="0.00"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="goal-date">Target date (optional)</label>
        <input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      {error && <p className="formError">{error}</p>}
      <div className="formActions">
        {goal ? (
          <button type="button" className="btnDanger" onClick={handleDelete} disabled={pending}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="btnPrimary" disabled={pending}>
          {goal ? 'Save' : 'Add goal'}
        </button>
      </div>
    </form>
  );
}