<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules (Support Knowledge web)
- Visitors may read only the `public_*` views. Never grant `anon` access to a base table; never use the service-role key in the app or in Vercel (only the local import script).
- Every admin page and server action must call `requireAdmin()` first. Writes go through the `admin_*` database functions so history stays immutable. Deleting is a soft delete.
- Never commit `.env*` (except `.env.example`), `migration-export/` or any exported business data. Never print record content in logs or error output.
- Uploading data to Supabase needs the user's explicit go-ahead: run `scripts/import_supabase.mjs` as a dry run first; `--apply` only when told to.
- Keep every screen usable at 375px wide (no sideways scrolling, 44px touch targets, 16px form text). Arabic text stays right-to-left and is never altered.
- Calculators are exact decimal translations of the source workbook; keep them matched to `tests/pricing.test.ts`. Never `eval` text.
- Use shadcn/ui components from `src/components/ui`. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before calling work done.
