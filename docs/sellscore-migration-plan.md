# HarvestFile Sell Score Phased Migration Plan

**Last updated:** May 15, 2026
**Owner:** Andrew Angerstien
**Status:** Active
**Repo path:** `docs/sellscore-migration-plan.md`

---

## Why this document exists

This plan governs how HarvestFile transitions from the legacy `/dashboard` (B2B insurance-agent CRM) and `/morning` (free public dashboard) into a unified, focused, paid product anchored at `/sellscore/me`.

It exists because the pivot is not a one-night cleanup. The legacy code contains genuinely differentiated capability — the Monte Carlo Probability Engine, the Payment Hunter, the Intelligence Hub with parameterized AI reports, the live MYA → PLC payment tracker — that took real engineering work to build. Throwing it out is wrong. Folding all of it into the Sell Score by mid-July launch is also wrong. The right answer is a phased migration that preserves value and ships on time.

When scope creep tries to enter the build (and it will), this document is the source of truth we point at. The phases are not suggestions. They are the path.

---

## The pivot context (one paragraph)

Pre-March 2026: HarvestFile was a B2B platform for crop insurance agents and farm advisors managing books of farmer clients. Auth chain: `auth.users → professionals → organizations → farmers`. Primary surface: `/dashboard` with Markets, Insurance, Intelligence, Payments, Reports, Analytics modules.

March 24, 2026: Pivot decision documented in "Stop Building, Start Shipping." New product strategy: a daily, personalized grain-marketing decision number ("Sell Score") sold direct-to-farmer at $149/yr. Auth chain: `auth.users → farms.owner_id` direct. Primary surface: `/sellscore/me`.

May 15, 2026: This document formalizes the migration sequence between those two architectures.

---

## Phase 1 — Mid-July 2026 launch

**Ship date target:** July 15, 2026
**Scope:** The Sell Score as a focused daily product, plus one adjacent paid surface.

### What ships

| Surface | Purpose | Status as of May 15 |
|---------|---------|---------------------|
| `/sellscore/me` | Daily Sell Score, recommendation, position, downside protection | Built |
| `/sellscore/markets` | Live commodity prices, basis tracker, MYA → PLC tracker (ported from `/dashboard/markets`, refactored to `farms.owner_id` auth) | To build (May 19 → Jun 15) |
| `/sellscore/settings` | Breakeven per crop, expected bushels, position updates, elevator preferences | To build |
| `/sellscore/weather` widget | Small 7-day forecast block on `/sellscore/me` sidebar | To build (Jun 15 → Jul 15) |
| Paid-user top nav | Score \| Markets \| Settings (three tabs) | To build |
| Discipline-aid framing copy | Across `/sellscore/me`, 5 AM email placeholder, `/pricing` FAQ, SELL recommendation card | To build (Sat May 16) |
| Signup funnel monitor cron | Inngest health check; alerts on paid-not-onboarded >24hr and active-no-recommendation | To build (Sat May 16) |
| Multi-crop UI fix | Write-one-per-day recommendation with deterministic priority (highest dollar-of-opportunity, ties broken by largest unsold position) | To build (Sat May 16) |

### What sunsets

| Route | Disposition |
|-------|-------------|
| `/dashboard`, `/dashboard/*` | 301 → `/sellscore/me` (authed) or `/pricing` (anon). Code moves to `app/_archive/dashboard/`. |
| `/morning` | 301 → `/pricing`. Code moves to `app/_archive/morning/`. Daily-use pieces (commodity prices, basis tracker, weather) port to `/sellscore/markets` and `/sellscore/weather` widget. |
| Marketing Score gauge (on `/morning`) | Killed. Sell Score replaces it. No two-scores problem. |

### What does NOT ship in Phase 1 (explicit anti-goals)

- Coverage Optimizer / Monte Carlo Probability Engine — Phase 2
- Intelligence Hub (AI reports) — Phase 3
- Payment Hunter — Phase 3
- Reports archive — Phase 4
- Customization beyond breakeven / bushels / position / elevators — Phase 4
- Multi-entity, multi-farm-per-account, hedge integration, brokerage integration, FCIC AIP integration, storage carry calculator, anonymous peer benchmarking — explicit v1 anti-goals from Sell Score Build Spec, remain anti-goals through Phase 4 minimum
- Native mobile app — Phase 5+
- SMS or push notifications — Phase 5+

### Phase 1 acceptance criteria

1. A new paid farmer can sign up via `/pricing`, complete onboarding, land on `/sellscore/me`, see today's recommendation, click to `/sellscore/markets`, see live commodity prices and basis at their elevators, click to `/sellscore/settings`, update breakeven, return to `/sellscore/me`, see the recommendation update if math has changed.
2. `/dashboard/*` and `/morning` return 301 redirects (verified by curl or browser test).
3. `/pricing` free-tier feature list contains no references to defunct features.
4. No farmer paying for the Sell Score sees a "Marketing Score" anywhere in the product.
5. Barchart production contract is signed before Markets module ports out of archive. Fallback: USDA MyMarketNews API registered as documented backup.

---

## Phase 2 — August 2026 (Coverage Optimizer)

**Target:** Port Coverage Optimizer + Monte Carlo Probability Engine + AI Strategy Analysis side panel from `app/_archive/dashboard/insurance/` to `/sellscore/coverage`.

### Why this is Phase 2

This is the killer feature. It is the "FIRST EVER" probability-weighted strategy comparison. It is what makes a $149/yr subscriber renew. It is also the most architecturally complex module to port — it has complex state management (10,000 Monte Carlo simulations cached per scenario), a side-panel UI overlay pattern, and integrates with multiple data sources (RMA actuarial data, NASS yields, MYA price projections).

Porting it first would have slipped the July launch. Porting it second means we land it on a paying-customer base that's already telling us what they want.

### Scope

- Refactor data access from `professionals → organizations → farmers` to `farms.owner_id` direct
- Port UI components (Coverage Stack, Best Option card, All Scenarios Ranked, Monte Carlo Probability Engine, Risk vs Reward scatter, Net Benefit Distribution histogram, Net Benefit Percentiles table, Simulated Market Conditions, AI Strategy Analysis side panel with Overview / Percentiles / Distribution / AI Insights tabs)
- Add `/sellscore/coverage` to paid-user nav as fourth tab
- Correctness regression: verify Monte Carlo simulation results match legacy `/dashboard/insurance` results within rounding tolerance

### Out of scope for Phase 2

- Live crop insurance agent matching (out indefinitely — explicit v1 anti-goal)
- FCIC AIP integration (out indefinitely — explicit v1 anti-goal)

---

## Phase 3 — September 2026 (Intelligence Hub + Payment Hunter)

**Target:** Port two modules. Both are monthly-use tools, not daily.

### Intelligence Hub → `/sellscore/intelligence`

AI-generated parameterized reports across Market Intelligence, Weather & Yield Impact, Program Optimization, Seasonal Advisory. Farmers generate one of these once a month, not daily.

### Payment Hunter → `/sellscore/payments`

Scans every active USDA program for eligibility based on farm profile. Surfaces deadline alerts (FBA, SDRP, etc.). Farmers run this when new programs are announced and when deadlines approach. Maybe 2-3x per year for a typical farmer; more during program enrollment windows.

### Scope

- Auth refactor on both modules (`professionals → organizations → farmers` → `farms.owner_id` direct)
- Port UI
- Add to paid-user nav as fifth and sixth tabs
- Configure deadline alert system for Payment Hunter (cron-based notification when a new program is detected or a deadline approaches; routes through existing Resend infrastructure)

---

## Phase 4 — October 2026 (Reports + Full Settings + Customization)

**Target:** Polish, depth, and customization driven by 90 days of paying-farmer feedback.

### Scope

- Reports archive (`/sellscore/reports`): historical record of all generated Intelligence reports, exportable as PDF via existing pdf-lib pipeline
- Full settings panel: notifications, billing, account management, data export
- Deeper customization driven by farmer feedback (specific items TBD based on Phase 1-3 learnings)

### Decision rule for Phase 4 customization

What gets built in Phase 4 customization is determined by:

1. Frequency of feature requests from paying farmers in Phases 1-3
2. Match to the daily-use thesis (does this make the daily decision better?)
3. Engineering cost (small wins > big bets at this stage)

If no clear winner emerges from farmer feedback, Phase 4 ships as polish only and the next milestone is January 2027 (post-harvest annual planning surface).

---

## Auth refactor notes

The single biggest reason this is a phased migration and not a single-night cleanup.

### Current state

Two auth chains coexist in the database:

**Legacy chain** (used by everything in `app/_archive/dashboard/*`):

```
auth.users (Supabase)
  → professionals (auth_user_id FK)
  → organizations (org_id FK on professionals)
  → farmers (org_id FK on farmers)
  → [calculations, reports, etc. FK to farmers]
```

**Sell Score chain** (used by `/sellscore/me`):

```
auth.users (Supabase)
  → farms (owner_id FK directly)
  → [recommendations, positions, elevators, basis_history FK to farms]
```

### Refactor approach per module

For each module being ported into `/sellscore/*`:

1. Identify all Supabase tables the module reads and writes
2. Add `owner_id` columns (FK to `auth.users`) where missing
3. Backfill `owner_id` for existing rows (dev data only — production has no users on the legacy chain)
4. Introspect existing constraints with `pg_get_constraintdef` before any migration (per codified learning #10)
5. Rewrite RLS policies to use `WHERE owner_id = auth.uid()` — the short form, never the long professionals-lookup form
6. Refactor server actions and route handlers to query by `owner_id` instead of joining through professionals/organizations
7. Drop legacy joins from the queries
8. Test E2E: signup → onboarding → access ported module → write data → verify RLS isolation across two test accounts

### What we explicitly do NOT do

We do NOT maintain dual auth chains in the new product. Every module landing under `/sellscore/*` uses `farms.owner_id` direct. No exceptions. Maintaining two auth chains in one product is exactly the kind of debt that compounds and kills startups.

The legacy `professionals` and `organizations` tables stay in the database (we may need them again for a future B2B reseller motion), but they are not referenced by any code in the active `app/` directory. They are referenced only from `app/_archive/` which is excluded from the build.

---

## What is preserved in app/_archive/

`app/_archive/` contains code that is no longer compiled into the build (the underscore prefix makes Next.js ignore the directory) but is preserved as source material for future phases.

### app/_archive/dashboard/

| Folder | Phase | Notes |
|--------|-------|-------|
| `_components/` | shared | Reusable UI primitives; cherry-pick as needed |
| `alerts/` | Phase 5+ | Alert center; not on near-term roadmap |
| `analytics/` | Phase 5+ | Portfolio analytics; depends on multi-farm support |
| `calculator/` | replaced | Already replicated as `/check`; can be deleted after archive verified |
| `farmers/` | Phase 5+ | Multi-farm management; explicit v1 anti-goal |
| `insurance/` | **Phase 2** | Coverage Optimizer + Monte Carlo — killer feature |
| `intelligence/` | **Phase 3** | AI reports |
| `markets/` | **Phase 1** | Live MYA / PLC tracker, commodity prices |
| `payments/` | **Phase 3** | Payment Hunter, deadline alerts |
| `reports/` | **Phase 4** | Reports archive |
| `settings/` | **Phase 4** | Full settings panel |
| `layout.tsx`, `page.tsx` | reference | Dashboard shell; do not port the layout, rethink for direct-to-farmer |

### app/_archive/morning/

Contains the legacy free Morning Dashboard. Its valuable daily-use components (commodity prices, local basis tracker, weather forecast, soil/planting readiness) migrate to `/sellscore/markets` and `/sellscore/weather` widget in Phase 1. The Marketing Score gauge does NOT migrate — Sell Score replaces it. The page itself does not return.

---

## Premortem applied to this plan

It is November 15, 2026. HarvestFile failed. What went wrong?

### Failure mode A: scope creep in Phase 1

We promised Phase 1 ships July 15 with Sell Score + Markets + Settings. Mid-June we got excited about Coverage Optimizer and started porting it "since it's the killer feature anyway." Auth refactor on the Insurance module took three weeks instead of one (state management complexity surprised us). Launch slipped to September. Barchart cliff hit July 1 with zero revenue. Lost the data partnership. Product died.

**Counter:** Phase 2 cannot start until Phase 1 ships. No exceptions. If Coverage Optimizer feels urgent in June, the response is "Phase 2 starts August 1," not "let's squeeze it in."

### Failure mode B: the daily-habit thesis died from feature density

We shipped Phase 1 on time but the paid-user nav had Score | Markets | Coverage | Intelligence | Payments | Weather | Reports | Settings because we couldn't resist exposing what was already half-built in archive. Farmers opened `/sellscore/me`, saw eight tabs, got overwhelmed, didn't form the daily habit, didn't renew at month 12.

**Counter:** Paid-user nav at Phase 1 launch is THREE TABS. Score | Markets | Settings. Adding a tab requires Phase advancement, which requires premortem re-application.

### Failure mode C: auth refactor accumulated debt instead of resolving it

Mid-port on the Markets module we hit an edge case and decided to "keep the legacy auth chain just for this one module, refactor later." Six months later five modules have legacy auth and the refactor is twice as hard as starting fresh would have been.

**Counter:** No module ships into `/sellscore/*` with the legacy auth chain. If the refactor is hard for a given module, the module is deferred to a later phase, not shipped with debt.

### Failure mode D: we kept the B2B mental model in the UX

The `/dashboard` "Welcome back, Andrew. Total Farmers: 1, Active Crops: 0, Total Acres: 0" stat tiles felt useful so we ported them to `/sellscore/me`'s homepage. The product started looking like a CRM. Farmers said "this feels like accounting software" and bounced.

**Counter:** When porting a module, the UX is rethought from scratch for direct-to-farmer use, not copy-pasted from the B2B layout. The screen test: "Does a 62-year-old farmer with coffee and reading glasses understand what to do in 30 seconds?"

### Failure mode E: Markets module ported but Barchart contract never closed

Markets in `/dashboard` pulled from Barchart sandbox. After the sandbox expired July 1 and we hadn't signed the production contract yet (Mike Gerot pricing pending), Markets in `/sellscore` went stale or broke at launch.

**Counter:** Barchart production contract must be signed BEFORE the Markets module ports out of archive. This is on the Phase 1 critical path. If the Barchart deal falls through, USDA MyMarketNews API is the documented fallback and we register before the cliff.

### Failure mode F: we did the right phasing but never actually got paying farmers

Phase 1 shipped focused and clean. But our acquisition funnel didn't convert. The 5 AM email had low signup. `/check` and `/advisor` traffic didn't move to `/pricing`. Without paying farmers in Phase 1, the validation gating Phase 2-4 was empty.

**Counter:** Phase 1 includes the signup funnel monitor cron (Sat May 16 build) precisely to surface this failure mode before it metastasizes. If we hit launch with <100 signups in the first 14 days, the response is acquisition channel work, not more product surface.

---

## Decision rules (when to deviate from this plan)

We deviate from this plan only when ONE of the following is true:

1. **A paying farmer cannot use the product** because of a Phase 1 omission. This justifies pulling Phase 2+ work earlier.
2. **The Barchart partnership requires it.** (Example: Mike Gerot says "you need to demo Coverage Optimizer to close the production contract." That's a real reason. Document and accept.)
3. **A premortem-identified failure mode is materializing.** (Example: actual farmer feedback in Phase 1 says they will NOT renew without Coverage. Accelerate.)
4. **A new external constraint emerges.** (Example: USDA changes a rule that requires a Reports module immediately.)

We do NOT deviate from this plan because:

- A feature is "almost done in archive" and "easy to port"
- A founder gets excited about a capability mid-week
- A competitor launches something
- The plan feels boring

If a deviation is justified, it requires:

1. Explicit premortem re-application in writing
2. A revised migration plan committed to this document
3. A 24-hour cooling-off period before code is written

---

## Document update log

| Date | Author | Change |
|------|--------|--------|
| 2026-05-15 | Andrew Angerstien + Claude (architecture session) | Initial document creation. Phase 1 through 4 defined. Auth refactor approach documented. Premortem applied. |
