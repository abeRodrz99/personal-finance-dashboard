# Finance

Personal net worth, holdings, and spending — React + Vite, with Supabase for
the database and authentication.

Manual entry only for now. The data layer (`src/lib/repository.ts`) talks to
Supabase tables that are shaped like Plaid's data model, so swapping in a bank
aggregator later is a data-source change, not a schema rewrite.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's up, open **SQL Editor → New query**, paste in the contents of
   `supabase/schema.sql`, and run it. This creates every table, enables Row
   Level Security, and adds a trigger that gives each new user an
   "Uncategorized" category automatically.
3. Go to **Project Settings → API**. You'll need:
   - **Project URL**
   - **anon public** key

By default Supabase requires email confirmation for new sign-ups. For a
single-user personal project you can turn that off under **Authentication →
Providers → Email → Confirm email** if you'd rather skip the inbox step.

---

## 2. Configure the app

```bash
cp .env.example .env.local
```

Fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe to ship to the browser — Row Level Security is what
actually protects the data. Every table's policies check `auth.uid()`, so one
signed-in user can never read or write another's rows, even though everyone
shares the same anon key.

---

## 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173, sign up with an email + password, and you're in.
Your first account, category, and transaction all get scoped to your user
automatically.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** the repo. Framework preset: **Vite**.
3. Add the two env vars from step 2 under **Settings → Environment
   Variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy.

Because auth and data both live in Supabase, there's no server component to
host — Vercel just serves the static build, and the browser talks to Supabase
directly (over HTTPS, protected by RLS).

---

## How data flows

- **Auth** — `src/contexts/AuthContext.tsx` wraps Supabase's session state.
  `ProtectedRoute` redirects to `/login` if there's no session.
- **Reads/writes** — every card and form calls into
  `src/lib/repository.ts`, which is the only place that touches the Supabase
  client for data (as opposed to auth). Nothing else imports `supabase`
  directly for table access.
- **Balances** — account balances aren't recomputed from transactions on
  every load. `insertTransaction` / `updateTransaction` / `deleteTransaction`
  adjust the account's `balance_cents` directly, the same way Plaid's webhook
  model would.

## Conventions carried over from the original design

- **Money is always integer cents.** `$118.64` → `11864`. Conversion to/from
  dollars happens only at the form boundary (`src/lib/money.ts`).
- **Balances are positive magnitudes.** A credit card owing $1,842 stores
  `184200`, not `-184200`. Sign is applied by `netWorthContribution()` in
  `src/lib/types.ts`.
- **Transaction amounts are inverted from a bank statement** — positive means
  money *left* the account, matching Plaid's convention. Use `isOutflow()` /
  `isInflow()` rather than comparing to zero.

## Layout

```
src/
  lib/            Supabase client, types, money helpers, repository (all CRUD)
  contexts/       AuthContext, ThemeContext
  components/
    auth/         ProtectedRoute
    layout/       Shell, Grid
    primitives/   Card, Row, Dialog
    nav/          ThemeToggle
    cards/        Accounts, Transactions, Holdings, Budgets (dashboard cards)
    forms/        Account/Transaction/Holding/Category forms
    networth/     Net worth hero chart
  pages/          Login, Dashboard, Transactions, Categories
supabase/
  schema.sql      Full schema + RLS policies + auto-seed trigger
```

## What's next (not built yet)

- **Net worth history** — the trend chart currently derives a flat series
  from today's balances. A real month-over-month trend needs snapshots
  written periodically (e.g. a Supabase Edge Function on a cron schedule
  writing into `net_worth_snapshots`).
- **Bank aggregation (Plaid, etc.)** — the schema already matches Plaid's
  shape, so this becomes a background sync job that writes into the same
  tables rather than a UI change.
- **Password reset flow** — Supabase supports it out of the box
  (`supabase.auth.resetPasswordForEmail`); just needs a page for it.
