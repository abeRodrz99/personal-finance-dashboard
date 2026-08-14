import { useState } from 'react';
import { Card } from '../primitives/Card';
import { Dialog } from '../primitives/Dialog';
import { GoalForm } from '../forms/GoalForm';
import { formatMoney } from '../../lib/money';
import { resolveGoalProgress } from '../../lib/repository';
import type { Account, Goal } from '../../lib/types';
import './GoalsCard.css';

interface GoalsCardProps {
  goals: Goal[];
  accounts: Account[];
  onChanged: () => void;
}

export function GoalsCard({ goals, accounts, onChanged }: GoalsCardProps) {
  const [dialogGoal, setDialogGoal] = useState<Goal | 'new' | null>(null);

  function close() {
    setDialogGoal(null);
    onChanged();
  }

  return (
    <>
      <Card
        title="Goals"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogGoal('new')}>
            + Add
          </button>
        }
      >
        {goals.length === 0 && <p className="cardEmpty">No goals yet. Add one to start tracking.</p>}
        {goals.map((goal) => {
          const current = resolveGoalProgress(goal, accounts);
          const pct = goal.target_cents > 0 ? Math.min(100, (current / goal.target_cents) * 100) : 0;
          const reached = current >= goal.target_cents;
          return (
            <div key={goal.id} className="goalRow" onClick={() => setDialogGoal(goal)}>
              <div className="goalRowHeader">
                <span className="goalRowName">{goal.name}</span>
                <span className="goalRowAmount tabular">
                  {formatMoney(current)} / {formatMoney(goal.target_cents)}
                </span>
              </div>
              <div className="goalTrack">
                <div
                  className={`goalFill${reached ? ' goalFillDone' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="goalRowFooter">
                <span>{pct.toFixed(0)}%{reached ? ' · reached!' : ''}</span>
                {goal.target_date && <span>by {goal.target_date}</span>}
              </div>
            </div>
          );
        })}
      </Card>

      <Dialog open={dialogGoal !== null} onClose={close} title={dialogGoal === 'new' ? 'Add goal' : 'Edit goal'}>
        {dialogGoal && (
          <GoalForm goal={dialogGoal === 'new' ? undefined : dialogGoal} accounts={accounts} onDone={close} />
        )}
      </Dialog>
    </>
  );
}