# Admin Dashboard — Empty Data Investigation

**Date:** 2026-09-30
**Reported by:** Mohammed Javid — "everything looks good now... in /admin I don't see any numbers"
**Status:** Code fixes applied and verified (typecheck + tests pass). One database-side fix is still pending — see [Action items](#action-items-still-pending).

## Summary

The admin dashboard (`/admin`) showed zero responses despite the reporter completing 10–12 survey run-throughs. Queried `survey_submissions`/`survey_answers` directly (via the Supabase secret key) and found **13 rows in the table, but every single one had `completed_at = null`** — none were ever marked complete, which is why the dashboard's completed-only queries returned nothing.

Three separate issues were found, only two of which are fixed:

| # | Issue | Where | Status |
|---|---|---|---|
| 1 | Dashboard/Responses/Analytics only ever showed *completed* submissions, by design — so partial data was invisible | App code | **Fixed** — Dashboard & Responses now show everything; Analytics stays completed-only on purpose |
| 2 | The `purchase_frequency` question's answers were silently dropped before ever reaching the server | App code | **Fixed** |
| 3 | Anon `UPDATE`s to `survey_submissions`/`survey_answers` return success (HTTP 204) but never actually change the row, on the live database | Supabase RLS/grants | **Not fixed — needs a SQL statement run in the Supabase dashboard** (see below) |

Issue #3 is the one actually preventing any submission from ever completing, independent of #1 and #2.

---

## Scenario 1: Dashboard filtered out everything but completed submissions

**Symptom:** `/admin` showed 0 total responses, 0% everywhere.

**Cause:** `getAllSubmissions` / `getAllAnswers` (`src/lib/db/submissions.ts`) filtered with `.not("completed_at", "is", null)` — deliberate, to keep abandoned drafts from skewing analytics. Since (per Scenario 3) nothing was ever actually being marked complete, this filter hid all 13 rows sitting in the table.

**Fix applied:**
- `getAllSubmissions`, `getAllAnswers`, `getSubmissionDetail` no longer filter by `completed_at` — they return everything.
- Added `filterCompleted()` in `src/lib/analytics/aggregate.ts` for pages that specifically want completed-only data.
- **Dashboard** (`/admin`) and **Responses** (`/admin/responses`, `/admin/responses/[id]`) now show every row, all-time, with a **Completed / In progress** status badge.
- **Analytics** (`/admin/analytics`) deliberately still filters to completed submissions only (via `filterCompleted`), so channel/priority/budget/frequency breakdowns aren't diluted by half-finished drafts. This is called out in the page's own caption ("N completed responses").
- `computeDashboardStats` now returns both `totalResponses` (all rows) and `completedResponses` (subset with `completed_at` set), shown as two separate stat cards.

**Files changed:** `src/lib/db/submissions.ts`, `src/lib/analytics/aggregate.ts`, `src/app/admin/(dashboard)/page.tsx`, `src/app/admin/(dashboard)/analytics/page.tsx`, `src/app/admin/(dashboard)/responses/page.tsx`, `src/app/admin/(dashboard)/responses/[id]/page.tsx`, `src/components/admin/ResponseTable.tsx`, `tests/aggregate.test.ts`.

---

## Scenario 2: `purchase_frequency` question id collision silently dropped answers

**Symptom:** Not one of the 9 submissions with any answers at all had a `purchase_frequency` answer — not in `survey_answers`, not in the denormalized `survey_submissions.purchase_frequency` column — even the two that reached the actual last question of the survey.

**Cause:** The survey was trimmed from ~15–20 questions down to 5 (see `supabase/migrations/0005_remove_trimmed_questions.sql`, `0006_trim_to_five_questions.sql`, and the `src/config/surveyQuestions.ts` diff). The old, pre-trim version had **separate** demographic fields called `area`, `age_group`, and `purchase_frequency` that were never real survey questions — just top-level fields split out of the answers object before saving (`SurveyContainer.tsx`'s `splitAnswersForSave`).

The trim reintroduced `purchase_frequency` as a **real question** ("How often do you buy dry fruits?") with the **exact same id**. `splitAnswersForSave` was never updated, so every time someone answered that question, its value got destructured out of `coreAnswers` as if it were the old demographic field — and then thrown away, because nothing downstream read the extracted value into anything that got saved either.

**Fix applied:**
- `splitAnswersForSave` (`src/components/survey/SurveyContainer.tsx`) no longer special-cases `purchase_frequency` — it now flows through as a normal core answer, gets written to `survey_answers` like any other question, and is *derived back* into the denormalized `survey_submissions.purchase_frequency` column server-side (`src/lib/db/submissions.ts`), the same way `purchase_channel` is already derived from `q1_purchase_channel`.
- `area` and `age_group` special-casing was left alone — those ids have no corresponding question anymore since the trim, so they're inert (always `undefined`), not buggy.

**Files changed:** `src/components/survey/SurveyContainer.tsx`, `src/lib/db/submissions.ts`.

---

## Scenario 3: Anon `UPDATE`s silently do nothing on the live database (unresolved)

**Symptom:** Real production data showed every submission's first-ever write (the `INSERT` on step 1) sticking, but nothing about a row ever changed afterward — no `completed_at`, no later-step answers via `UPDATE`, nothing.

**How it was confirmed (live test against the actual Supabase project):**
1. Inserted a throwaway row directly with the **service/secret key** (bypasses RLS): `source: "before"`.
2. Updated that same row with the **anon/publishable key** — the exact credential the app's Server Actions use — setting `source: "after"`.
3. The `PATCH` request returned **HTTP 204 (success)**.
4. Read the row back with the service key: **`source` was still `"before"`.** The update never actually applied, despite reporting success.

Repeated with `completed_at` directly (inserting a row, then anon-`PATCH`ing `completed_at` to a timestamp) — same result: 204, but the read-back showed `completed_at` still `null`.

**Cause:** `supabase/migrations/0003_incremental_progress.sql` and `0004_questions_and_normalized_answers.sql` both define
```sql
create policy "anon can update survey_submissions"
    on survey_submissions for update to anon using (true) with check (true);
```
— which is exactly what's needed — but on the live database this policy is evidently not taking effect for anon `UPDATE`s. This is a database-state problem, not an application code bug: the app's Server Actions (`submitSurvey`, `saveSurveyProgress` in `src/app/survey/actions.ts`) correctly build and send the update; Supabase/Postgres is accepting the request and reporting success while not applying it.

Because `UPDATE`s never persist, this single issue independently explains:
- `completed_at` never getting set (it's always set via `UPDATE`, never on the initial `INSERT`, since a submission's completeness isn't known at step 1)
- Any answer given on a step *after* the first ever silently failing to save if that particular question id had already been INSERTed earlier and now needed an UPDATE/re-select

### Action items (still pending)

Run this once in **Supabase Dashboard → SQL Editor** on the `skryxkowwctfgarpufne` project:

```sql
grant update on survey_submissions to anon;
grant update on survey_answers to anon;

drop policy if exists "anon can update survey_submissions" on survey_submissions;
create policy "anon can update survey_submissions"
    on survey_submissions for update to anon using (true) with check (true);

drop policy if exists "anon can update survey_answers" on survey_answers;
create policy "anon can update survey_answers"
    on survey_answers for update to anon using (true) with check (true);
```

Then:
1. Tell Claude/whoever's driving so the anon-UPDATE test above can be re-run to confirm it actually persists now.
2. Do one real click-through of the survey end to end, and check the resulting row in `survey_submissions` has `completed_at` set and a `purchase_frequency` answer recorded.
3. Only then redo the 10–12 test surveys for real — the 13 existing rows in the table are all still stuck incomplete/partial and can be left as-is or deleted once you've confirmed the fix, whichever you prefer.

---

## Current data snapshot (at time of writing)

- **13 rows** in `survey_submissions`, **0 with `completed_at` set**
- **9 of the 13** have at least one answer in `survey_answers`
- Answer counts by question, across all 13: `q1_purchase_channel` (9), `monthly_budget` (4), `top_priorities` (4), `favorite_dry_fruits` (3 — a pre-trim question, safe to ignore), `improvement_feedback` (2)
- **0 rows** have a `purchase_frequency` answer anywhere (now fixed going forward, per Scenario 2)

## Verification done so far

- `npx tsc --noEmit` — clean
- `npx vitest run` — 36/36 tests passing (one test updated for the new `completedResponses` field, one new test added)
- Live REST calls against the production Supabase project (using the secret key) to confirm table contents and reproduce the anon-`UPDATE` failure
