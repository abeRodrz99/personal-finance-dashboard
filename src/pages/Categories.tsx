import { useCallback, useEffect, useState } from 'react';
import { Shell } from '../components/layout/Shell';
import { Card } from '../components/primitives/Card';
import { Row } from '../components/primitives/Row';
import { Dialog } from '../components/primitives/Dialog';
import { CategoryForm } from '../components/forms/CategoryForm';
import { formatMoney } from '../lib/money';
import { listCategories } from '../lib/repository';
import type { Category } from '../lib/types';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogCat, setDialogCat] = useState<Category | 'new' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setCategories(await listCategories());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function close() {
    setDialogCat(null);
    load();
  }

  return (
    <Shell title="Categories" showBack>
      <p style={{ color: 'var(--mid)', fontSize: 14, marginBottom: 'var(--space-4)', maxWidth: 560 }}>
        Categories are yours to change. Spending categories can carry a monthly limit, which is what
        the budget bars on the dashboard measure against. Deleting a category never deletes its
        transactions — they move to Uncategorized.
      </p>

      <Card
        title="All categories"
        actions={
          <button type="button" className="cardAddBtn" onClick={() => setDialogCat('new')}>
            + Add
          </button>
        }
      >
        {loading && <p className="cardEmpty">Loading…</p>}
        {!loading &&
          categories.map((c) => (
            <Row
              key={c.id}
              title={c.name}
              subtitle={c.kind}
              trailing={c.monthly_limit_cents ? formatMoney(c.monthly_limit_cents) : '—'}
              onEdit={() => setDialogCat(c)}
            />
          ))}
      </Card>

      <Dialog open={dialogCat !== null} onClose={close} title={dialogCat === 'new' ? 'Add category' : 'Edit category'}>
        {dialogCat && <CategoryForm category={dialogCat === 'new' ? undefined : dialogCat} onDone={close} />}
      </Dialog>
    </Shell>
  );
}
