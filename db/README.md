\# db/ — Database SQL operations



This directory holds SQL files used for database operations performed outside the main application code: seeding test data, cleanup queries, and one-off maintenance steps applied directly via the Supabase SQL editor.



\## Files



\- \*\*`seed-test-farm.sql`\*\* — Inserts the canonical "Sell Score Test Farm" used by `data-fetcher.ts` e2e tests and engine integration verification. NOT idempotent — running twice creates two farms. Use `cleanup-test-farm.sql` first if re-seeding.



\- \*\*`cleanup-test-farm.sql`\*\* — Deletes the test farm and its grain positions. All statements commented out by default. Uncomment specific statements before running.



\- \*\*`maintenance.sql`\*\* — Append-only log of one-off DB operations (constraint additions, manual data fixes, etc.). Each entry dated and described. Never delete entries; mark superseded ones with a comment.



\- \*\*`create-sellscore-sales-log.sql`\*\* — Creates `public.sellscore_sales_log` (Sell Score spec §6.1) with short owner-chain RLS (SELECT/INSERT only). Idempotent. Added July 23, 2026 (Round 2); run via the Supabase SQL editor before or with the Round 2 deploy — the app degrades gracefully until it runs.



\- \*\*`add-grain-positions-updated-at.sql`\*\* — Adds the missing BEFORE UPDATE trigger (and, defensively, the column) so `grain_positions.updated_at` actually moves on every write. Idempotent. Added July 24, 2026 (Hotfix R2.1 Item B #3); run BEFORE the corn correction.



\- \*\*`correct-corn-position-2026-07-24.sql`\*\* — Restores the Sell Score Test Farm corn position (27,200 → 25,000) after the July 23 evidence-gap write. Guarded on the spurious value — safe to re-run. Added July 24, 2026 (Hotfix R2.1 Item B); run AFTER the updated_at trigger, then recompute.



\## Conventions



\- Every file starts with a comment block: what it does, when it was last run, what to verify after.

\- Cleanup operations are always commented out by default.

\- The `maintenance.sql` file is append-only — never edit history, only add new entries.

\- All statements use fully-qualified table names (`public.farms`, not `farms`).

\- Run via the Supabase SQL editor for project `fzduyjxjdcxbdwjlwrpu` unless noted.

