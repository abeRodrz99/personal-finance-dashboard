import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/primitives/Card';
import { Row } from '../components/primitives/Row';
import { Dialog } from '../components/primitives/Dialog';
import { CategoryForm } from '../components/forms/CategoryForm';
import { GroupForm } from '../components/forms/GroupForm';
import { formatMoney } from '../lib/money';
import { listCategories, listCategoryGroups } from '../lib/repository';
import type { Category, CategoryGroup } from '../lib/types';
import './Categories.css';

type CategoryDialog = { kind: 'category'; category?: Category; groupId?: string } | { kind: 'group'; group?: CategoryGroup };

export function Categories() {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialog, setDialog] = useState<CategoryDialog | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [groupsRes, categoriesRes] = await Promise.all([listCategoryGroups(), listCategories()]);
    setGroups(groupsRes);
    setCategories(categoriesRes);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function close() {
    setDialog(null);
    load();
  }

  const ungrouped = categories.filter((c) => !c.group_id && !c.is_uncategorized);
  const uncategorized = categories.find((c) => c.is_uncategorized);

  return (
    <Shell title="Categories" showBack>
      <p className="categoriesIntro">
        Group your spending categories the way you actually budget — Essentials, Personal, Savings, or
        whatever split makes sense to you. Each category can still carry its own monthly limit, which is
        what the budget bars on the dashboard measure against.
      </p>

      {loading && <p className="cardEmpty">Loading…</p>}

      {!loading &&
        groups.map((group) => {
          const groupCategories = categories.filter((c) => c.group_id === group.id);
          return (
            <Card
              key={group.id}
              title={group.monthly_limit_cents ? `${group.name} · ${formatMoney(group.monthly_limit_cents)}/mo` : group.name}
              actions={
                <div className="groupActions">
                  <button
                    type="button"
                    className="cardAddBtn"
                    onClick={() => setDialog({ kind: 'category', groupId: group.id })}
                  >
                    + Category
                  </button>
                  <button type="button" className="cardAddBtn" onClick={() => setDialog({ kind: 'group', group })}>
                    Edit
                  </button>
                </div>
              }
            >
              {groupCategories.length === 0 && <p className="cardEmpty">No categories in this group yet.</p>}
              {groupCategories.map((c) => (
                <Row
                  key={c.id}
                  title={c.name}
                  subtitle={c.kind}
                  trailing={c.monthly_limit_cents ? formatMoney(c.monthly_limit_cents) : '—'}
                  onEdit={() => setDialog({ kind: 'category', category: c })}
                />
              ))}
            </Card>
          );
        })}

      {!loading && (
        <Card
          title="Ungrouped"
          actions={
            <button type="button" className="cardAddBtn" onClick={() => setDialog({ kind: 'category' })}>
              + Category
            </button>
          }
        >
          {ungrouped.length === 0 && !uncategorized && <p className="cardEmpty">Nothing here.</p>}
          {ungrouped.map((c) => (
            <Row
              key={c.id}
              title={c.name}
              subtitle={c.kind}
              trailing={c.monthly_limit_cents ? formatMoney(c.monthly_limit_cents) : '—'}
              onEdit={() => setDialog({ kind: 'category', category: c })}
            />
          ))}
          {uncategorized && (
            <Row key={uncategorized.id} title={uncategorized.name} subtitle="Default catch-all" trailing="—" />
          )}
        </Card>
      )}

      {!loading && (
        <button type="button" className="addGroupBtn" onClick={() => setDialog({ kind: 'group' })}>
          + Add group
        </button>
      )}

      <Dialog
        open={dialog !== null}
        onClose={close}
        title={
          dialog?.kind === 'group'
            ? dialog.group
              ? 'Edit group'
              : 'Add group'
            : dialog?.category
              ? 'Edit category'
              : 'Add category'
        }
      >
        {dialog?.kind === 'category' && (
          <CategoryForm category={dialog.category} groups={groups} defaultGroupId={dialog.groupId} onDone={close} />
        )}
        {dialog?.kind === 'group' && <GroupForm group={dialog.group} onDone={close} />}
      </Dialog>
    </Shell>
  );
}
