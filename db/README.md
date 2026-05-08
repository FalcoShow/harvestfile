\# db/ — Database SQL operations



This directory holds SQL files used for database operations performed outside the main application code: seeding test data, cleanup queries, and one-off maintenance steps applied directly via the Supabase SQL editor.



\## Files



\- \*\*`seed-test-farm.sql`\*\* — Inserts the canonical "Sell Score Test Farm" used by `data-fetcher.ts` e2e tests and engine integration verification. NOT idempotent — running twice creates two farms. Use `cleanup-test-farm.sql` first if re-seeding.



\- \*\*`cleanup-test-farm.sql`\*\* — Deletes the test farm and its grain positions. All statements commented out by default. Uncomment specific statements before running.



\- \*\*`maintenance.sql`\*\* — Append-only log of one-off DB operations (constraint additions, manual data fixes, etc.). Each entry dated and described. Never delete entries; mark superseded ones with a comment.



\## Conventions



\- Every file starts with a comment block: what it does, when it was last run, what to verify after.

\- Cleanup operations are always commented out by default.

\- The `maintenance.sql` file is append-only — never edit history, only add new entries.

\- All statements use fully-qualified table names (`public.farms`, not `farms`).

\- Run via the Supabase SQL editor for project `fzduyjxjdcxbdwjlwrpu` unless noted.

