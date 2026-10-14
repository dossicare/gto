# Support Knowledge (web)

Next.js + Supabase version of the Support Knowledge app, built to be hosted on Vercel.

- **Public (no sign-in):** Offers (overview, search, details), General Terms, Templates (English/Arabic, copy and download), Pricing calculators.
- **`/admin` (email + password, one administrator):** add, edit and delete offers and templates, manage General Terms snapshots, download original source documents. Every save keeps the earlier version; "delete" hides a record and can be undone.
- Built mobile-first with Tailwind and shadcn/ui. The old Streamlit app in the parent folder is untouched.

## How access works

| Who | Can do | How it is enforced |
| --- | --- | --- |
| Anyone | Read the three `public_*` views only (a fixed list of columns) | Base tables are closed by row-level security; the views are the only door |
| Signed-in non-administrator | Nothing extra | Not in `admin_users`, so every policy and function refuses them |
| The administrator | Read everything, write through the `admin_*` functions | `admin_users` allow-list, checked in the proxy, on every admin page and action, and in the database |

The browser only ever holds the Supabase **anon** key. The **service-role** key is used once, on your computer, by the import script, and is never part of the website.

## Set up (about 20 minutes)

1. **Create a Supabase project** (free plan is fine). Pick a region close to you.
2. **Run the SQL.** In *SQL Editor*, run `supabase/migrations/20261014000001_schema.sql`, then `supabase/migrations/20261014000002_storage.sql`.
   Supabase may warn that the three `public_*` views are "security definer". That is intentional (see the comment in the file).
3. **Lock sign-ups.** *Authentication → Sign In / Providers → Email*: turn **off** "Allow new users to sign up".
4. **Create the administrator.** *Authentication → Users → Add user → Create new user*: your email and a strong password, with "Auto Confirm User" ticked.
5. **Allow that user as administrator.** In *SQL Editor* (use your email):
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. **Environment variables.** Copy `.env.example` to `.env.local` and fill in the project URL and anon key (*Project Settings → API*). Add the same two values in Vercel.
7. **Deploy on Vercel.** Put the `web/` folder in a Git repository (it has its own `.gitignore`; do not commit `.env.local` or `migration-export/`). In Vercel: *Add New → Project*, choose the repository, and if `web/` is a sub-folder set **Root Directory** to `web`. The defaults for Next.js are correct. Add the two environment variables, then deploy.
8. Sign in at `/admin/login`.

> Vercel's free *Hobby* plan is for personal, non-commercial use. Supabase's free plan pauses a project after a week without activity (you can un-pause it in the dashboard) and does not include automatic backups.

## Copying your existing data into Supabase

Everything runs on your own computer. Nothing is uploaded until step 4.

1. `python scripts/export_sqlite.py` reads `../data/offers.db` and `../data/operations.db` **read-only** and writes JSON and the original documents to `migration-export/` (git-ignored, private).
2. `node scripts/preflight.mjs` loads that export into an in-memory Postgres with the real schema and checks that every row fits and the public views show the right counts.
3. `node scripts/import_supabase.mjs` is a **dry run**: it re-checks the export (counts, unique keys, revisions, document checksums) and sends nothing.
4. To upload, put `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (never in Vercel) and run:
   ```
   node scripts/import_supabase.mjs --apply --confirm-host <your-project-ref>.supabase.co
   ```
   It only inserts rows that are missing, so it is safe to re-run and can never overwrite edits made later. It then checks the row counts.

What is copied: offers and every revision, templates and every revision, the General Terms snapshot, the original Word and PDF documents (to a private storage bucket), and the retained data from sections no longer in the interface (operations records, legacy records). The retained sections are admin-only and never shown publicly.

## Trying it without a database

```
npm install
npm run dev:fixtures      # http://localhost:3100 with fictional in-memory sample data
```
Sign-in is skipped in this mode, and it only works outside production. With real Supabase settings use `npm run dev`.

## Checks

```
npm test                   # logic, calculators, SQL access rules, migration pipeline
npm run typecheck && npm run lint
npm run build && node scripts/check-gate.mjs     # signed-out visitors cannot reach any /admin page
```

## Decisions to be aware of

- **Public pages show template "Internal guidance" notes**, as the old screens did. To hide them from visitors, replace the `blocks` line in the `public_templates` view with:
  ```sql
  (select coalesce(jsonb_agg(b), '[]'::jsonb) from jsonb_array_elements(t.payload -> 'blocks') b where b ->> 'kind' <> 'Notes') as blocks,
  ```
- Offer pages also show **Restrictions, Eligibility and Exclusions** when they have content (the old detail screen did not display them).
- The old Dashboard, Offers Database and Terms & Conditions screens listed the same offers, so they are one **Offers** screen here.
- Search engines are asked not to index the site (`noindex`).
- The wallet-discount calculator also rejects a discount below 0 or above 100 (the workbook formula gives meaningless results there). Everything else matches the Python version and the workbook's own examples.
- Documents (Word/PDF) can be downloaded only by the administrator. Uploading new offer attachments from the admin area is not built yet.
- There is no automatic backup on Supabase's free plan. Keep the original `data/` folder and `migration-export/` as a baseline, and export occasionally.

## Layout

```
src/app/(public)/      public pages          src/app/admin/        sign-in, console, server actions
src/components/        shared UI (ui/ = shadcn)   src/lib/        offers, templates, calculators, repositories
supabase/migrations/   database schema and access rules
scripts/               export, pre-flight, import, gate check
tests/                 unit, SQL and migration tests
```
