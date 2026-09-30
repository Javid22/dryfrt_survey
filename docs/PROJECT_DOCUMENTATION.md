# Dry Fruit Customer Research Survey — Project Documentation

A Next.js app with two halves: a public customer-facing survey, and an authenticated admin panel to view/analyze/export the results. Backed by Supabase (Postgres + Auth).

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, Zod (validation), Recharts (charts), Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Vitest + Testing Library.

---

## 1. High-level architecture

```
Customer                          Admin
   │                                │
   ▼                                ▼
/survey (public)              /admin/* (auth-gated by middleware)
   │                                │
   ├─ saveSurveyProgress()          ├─ Dashboard   (/admin)
   │   (Server Action, every        ├─ Responses   (/admin/responses, /admin/responses/[id])
   │   "Next" click)                ├─ Analytics   (/admin/analytics)
   ├─ submitSurvey()                ├─ Customer Voice (/admin/voice)
   │   (Server Action, final        └─ Settings    (/admin/settings)
   │   submit)                            │
   │                                      ▼
   ▼                              createClient() — Supabase server client,
Supabase (anon key + RLS)          forwards the admin's auth cookies so RLS's
INSERT/UPDATE only, no SELECT      `auth.role() = 'authenticated'` policies
                                    grant SELECT — no service role key used
                                    anywhere in the app.
```

Two trust boundaries, enforced entirely through Postgres Row Level Security (RLS), not app-level checks:
- **Anonymous customers** (the `anon` Postgres role, used by the public survey pages): can `INSERT`/`UPDATE` `survey_submissions` and `survey_answers`, but have **no `SELECT` or `DELETE`** — a customer can never read back anyone's answers, including their own.
- **Authenticated admins** (the `authenticated` role, i.e. anyone signed in via Supabase Auth): can `SELECT` everything, but the app never grants them `INSERT`/`UPDATE`/`DELETE` — all writes are done as `anon` regardless of who's driving the browser, since Server Actions call `createClient()` which uses the **anon key**, not any user-specific credential.

---

## 2. Database structure

### Tables

Defined in `supabase/migrations/`, applied in order 0001 → 0006. The **live shape** (after all migrations) is:

#### `questions` (lookup/reference table)
| column | type | notes |
|---|---|---|
| `id` | `varchar(50)` PK | matches `SURVEY_QUESTIONS[].id` in `src/config/surveyQuestions.ts` |
| `prompt` | `text` | the question wording, kept for reference — **not read at runtime**; rendering comes entirely from `surveyQuestions.ts` |
| `type` | `varchar(20)` | `single` \| `multiple` \| `text` \| `textarea` |
| `section` | `varchar(20)` | `core` \| `demographic` (stale for some rows — see [§6.3](#63-stale-questionssection-values)) |
| `required` | `boolean` | not enforced by Postgres; the app's own Zod schemas are the real source of truth |
| `sort_order` | `int` | |
| `created_at` | `timestamptz` | |

Purely for FK integrity and readability when inspecting data directly — exists so a `survey_answers` row is guaranteed to reference a real question/option.

#### `answer_options` (lookup/reference table)
| column | type | notes |
|---|---|---|
| `question_id` | `varchar(50)` | FK → `questions.id`, cascades on delete |
| `value` | `varchar(50)` | e.g. `"local_shop"` |
| `label` | `text` | e.g. `"Local dry-fruit shop"` |
| `sort_order` | `int` | |

PK: `(question_id, value)`.

#### `survey_submissions` (one row per respondent)
| column | type | notes |
|---|---|---|
| `id` | `uuid` PK | **generated client-side** (`randomUUID()` in `src/lib/db/submissions.ts`), not `gen_random_uuid()` — needed so the id is known before the first `INSERT`/`UPDATE` round trip |
| `survey_version` | `varchar(20)` | currently always `"v1"` in the write path — a latent inconsistency, see [§6.1](#61-survey_version-hardcoded-to-v1) |
| `source` | `varchar(50)` | defaults to `"web"` |
| `started_at` | `timestamptz` | when the customer started |
| `completed_at` | `timestamptz` \| `null` | **set only on final submit** (`isComplete: true`). `null` = still in progress / abandoned. This is the field the whole "completed vs all" distinction hinges on |
| `area` | `varchar(100)` | dead column today — no current question populates it (see [§6.4](#64-dead-areaage_group-fields)) |
| `age_group` | `varchar(50)` | dead column today, same reason |
| `purchase_frequency` | `varchar(100)` | denormalized mirror of the `purchase_frequency` question's answer (fixed 2026-09-30 — see investigation log) |
| `purchase_channel` | `varchar(50)` | denormalized mirror of `q1_purchase_channel`'s answer, for fast dashboard aggregation |
| `store_name`, `store_area`, `online_platform` | `text` | denormalized mirrors of old Q2 sub-questions — **dead columns**, those questions were removed in the 5-question trim |
| `created_at` | `timestamptz` | row creation time (first save, not submission time) |

Indexes: `created_at desc`, `area`, `purchase_channel`.

#### `survey_answers` (one row per submission × question, or per submission × question × selected-option for multi-select)
| column | type | notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `submission_id` | `uuid` | FK → `survey_submissions.id`, `on delete cascade` |
| `question_id` | `varchar(50)` | FK → `questions.id` |
| `option_id` | `varchar(50)` \| `null` | FK → `answer_options.value` for this question; `null` for free-text answers. Composite FK `(question_id, option_id)` → `answer_options(question_id, value)` — Postgres skips multi-column FK checks when any column is null, so free-text rows bypass it naturally |
| `answer_text` | `text` \| `null` | free-text answer, or the "please specify" text alongside `option_id = 'other'` |
| `is_selected` | `boolean` | **soft-delete flag**, not a real delete — see below |
| `created_at`, `updated_at` | `timestamptz` | |

Indexes: `submission_id`, `(question_id, option_id)`.

**Why soft-delete instead of `DELETE`:** `anon` has no `DELETE` policy on either table — by design, nobody (including the app itself) can delete a customer's answers through the API. Deselecting a multi-select option, or clearing a single/text answer, sets `is_selected = false` instead. All reads filter `is_selected = true`.

### Current live question set (5 questions, `SURVEY_VERSION = "v2"`)

Defined in `src/config/surveyQuestions.ts`, one per step (`STEP_GROUPS`):

| order | id | type | prompt |
|---|---|---|---|
| 1 | `q1_purchase_channel` | single | Where do you usually buy dry fruits? |
| 2 | `top_priorities` | multiple (max 3) | What matters most to you when choosing where to buy? |
| 3 | `monthly_budget` | single | What's your monthly budget for dry fruits? |
| 4 | `purchase_frequency` | single | How often do you buy dry fruits? |
| 5 | `improvement_feedback` | textarea | Is there anything you'd like to change...? (with tap-to-fill suggestions) |

This is the **third generation** of the survey — it went ~15–20 questions (v1, migration 0004's seed) → trimmed to remove `area`/`age_group`/`q2_online_platform`/`favorite_dry_fruits` (0005) → trimmed again to these 5 (0006), merging several old questions into `top_priorities` and `improvement_feedback`. The `questions`/`answer_options` lookup tables were updated in place to track this (old rows deleted, new ones inserted/upserted) — see [§6.3](#63-stale-questionssection-values) for what's still slightly out of sync.

### Row Level Security (RLS)

All four tables have RLS enabled. Policy summary (current, post-0004):

| Table | Role | Operation | Rule |
|---|---|---|---|
| `survey_submissions` | `anon` | INSERT | `with check (true)` — can create any row |
| `survey_submissions` | `anon` | UPDATE | `using (true) with check (true)` — can update any row |
| `survey_submissions` | `authenticated` | SELECT | `auth.role() = 'authenticated'` — full read |
| `survey_answers` | `anon` | INSERT | `with check (true)` |
| `survey_answers` | `anon` | UPDATE | `using (true) with check (true)` |
| `survey_answers` | `authenticated` | SELECT | full read |
| `questions` / `answer_options` | `authenticated` | SELECT | full read (not actually used by the app at runtime) |

No `DELETE` policy exists anywhere. No `SELECT` policy exists for `anon` anywhere — intentional, so a customer's `INSERT ... RETURNING` / `UPDATE ... RETURNING` is never usable (the app never asks for one; see `src/lib/db/submissions.ts` header comment). No `service_role` key is used by the app.

**⚠️ Known live issue:** as of 2026-09-30, `anon` `UPDATE`s on this project return HTTP 204 (success) but do not persist — confirmed by direct REST testing against the production database. The policies above are what the migration files declare; live behavior currently doesn't match. See the investigation log (`docs/dashboard-data-investigation.md`) for the reproduction steps and the SQL fix that needs to be run in the Supabase SQL Editor. Until that's applied, **no submission can ever be marked complete**, and no answer given after the very first step ever actually saves.

---

## 3. Survey write path (how a submission gets built up)

1. **First "Next" click** (step 1 answered): `saveSurveyProgress()` Server Action → `upsertSurveySubmission()` with no `submissionId` yet → generates a `uuid`, `INSERT`s the row (denormalized fields derived from the answers given so far) and `INSERT`s `survey_answers` rows for that step's question(s) only (`stepQuestionIds` scopes it — avoids re-sending every prior answer on every step, which is what made saves slower the further into the survey someone got).
2. **Every later "Next"**: same action, now with `submissionId` set → `UPDATE`s the submission row, and for the current step's answers: `INSERT`s brand-new ones, re-selects (`is_selected = true`) any previously-saved-then-cleared ones, and soft-deletes (`is_selected = false`) any that were deselected.
3. **Final "Submit"** (last step): `submitSurvey()` Server Action, same underlying `upsertSurveySubmission()` call but with `isComplete: true` → sets `completed_at = now()`, and does a full consistency pass over **every** answer (not just the current step), since this is the one point where the whole payload is re-validated end to end.
4. **Client-side draft**: the whole in-progress state (`answers`, `otherValues`, `startedAt`, `currentStepIndex`, `submissionId`, `savedAnswerKeys`) is mirrored into `localStorage` on every change, so a refresh mid-survey doesn't lose progress. Cleared on successful final submit.
5. **Stale-submission handling**: if a `submissionId` from a stale `localStorage` draft no longer exists as a row (e.g. deleted independently, or a schema reset), the `UPDATE` silently matches 0 rows (RLS + no SELECT policy means row-count can't be checked directly) but the subsequent `survey_answers` `INSERT` throws a foreign-key violation (`23503`), which the code specifically detects and treats as "this id is stale."
6. **Honeypot**: a hidden `website` field — any non-empty value is treated as spam and the submission is rejected with a generic error, without revealing why (so simple bots don't learn to work around it).

Answer shape reference (`src/lib/survey/answerRows.ts`): the client's flat `{ questionId: value }` map becomes one `survey_answers` row per single/text answer, and one row per selected option for a multi-select answer. An "Other, please specify" free-text value is folded onto the same row as the `option_id = 'other'` selection (key suffix `__other` on the client side), not stored as its own fake question.

---

## 4. Admin dashboard

All routes under `src/app/admin/(dashboard)/`, gated by `src/app/admin/(dashboard)/layout.tsx`: redirects to `/admin/login` if `supabase.auth.getUser()` returns no user. `src/middleware.ts` additionally refreshes the auth session cookie on every non-static request.

| Route | File | Purpose |
|---|---|---|
| `/admin` | `page.tsx` | Dashboard home — stat cards + purchase channel breakdown |
| `/admin/responses` | `responses/page.tsx` | Full table of every submission (completed + in-progress), with area filter and CSV export |
| `/admin/responses/[id]` | `responses/[id]/page.tsx` | One submission's full detail: denormalized fields + every question's answer |
| `/admin/analytics` | `analytics/page.tsx` | Charts: purchase channel, top priorities, monthly budget, purchase frequency — **completed submissions only** |
| `/admin/voice` | `voice/page.tsx` | Feed of open-text `improvement_feedback` answers, newest first |
| `/admin/settings` | `settings/page.tsx` | Signed-in-as info, change password, survey version/config pointer |
| `/admin/login` | `../login/page.tsx` | Email/password sign-in form |
| `/api/admin/export` | `api/admin/export/route.ts` | CSV download of all submissions — re-checks auth itself since it's a route handler, not covered by the layout's redirect |

### 4.1 Data layer (`src/lib/db/submissions.ts`)

- `getAllSubmissions(client)` — every row in `survey_submissions`, newest first. **No completion filter** (as of 2026-09-30 — previously excluded in-progress drafts; changed so admins can see everything sitting in the table).
- `getAllAnswers(client)` — every `is_selected = true` answer row, across every submission (completed or not), grouped by submission id.
- `getSubmissionDetail(client, id)` — one submission + its answers keyed by `question_id`. No completion filter either — an in-progress draft can be viewed by id.
- `upsertSurveySubmission(client, input)` — the shared write path described in §3, used by both Server Actions.

### 4.2 Aggregation layer (`src/lib/analytics/aggregate.ts`)

Pure functions, no DB access — take already-fetched submissions/answers and shape them for display. Nothing here is hardcoded; everything is computed from whatever data is passed in.

- `filterByArea(submissions, area)` — `"All Areas"` = no-op, else exact (case-insensitive) match on `submission.area`. **Note:** since `area` is currently a dead column (§6.4), this filter is presently a no-op in practice regardless of the dropdown's selection, until a question repopulates it.
- `filterCompleted(submissions)` — keeps only rows with `completed_at !== null`. Used by the Analytics page only, so drafts don't skew the charts.
- `purchaseChannelBreakdown(submissions)` — counts by the denormalized `purchase_channel` column (fast, no join needed).
- `topPriorities`, `monthlyBudgetBreakdown`, `purchaseFrequencyBreakdown` — all built on the generic `countOccurrences(answers, questionId, submissionIds)` helper, which reads from the normalized `survey_answers` rows (handles both single and multi-select shapes) and maps option values to their display labels via `getQuestionById`.
- `computeDashboardStats(submissions, answers)` — the Dashboard's stat cards:
  - `totalResponses` — every row, completed or not
  - `completedResponses` — subset with `completed_at` set
  - `offlineBuyerPct` / `onlineBuyerPct` — percentage of respondents **who have answered Q1 at all** (not percentage of `totalResponses`, so drafts that never got past the welcome screen don't dilute the numbers) who chose an offline channel (`local_shop`, `supermarket`, `wholesale_market`) vs `online`.

### 4.3 CSV export (`src/lib/analytics/csv.ts`)

`buildSurveyCsv(details)` — one row per submission: id, date, purchase channel, top priorities (semicolon-joined), monthly budget, purchase frequency, feedback text. RFC 4180 field escaping (quotes fields containing commas/quotes/newlines). Served by `/api/admin/export` as `survey_responses.csv`, auth-checked independently of the layout guard since API routes aren't covered by it.

### 4.4 Filtering

`AreaFilter` (`src/components/admin/Filters.tsx`) is the one cross-page filter — a client component that pushes an `?area=` search param, read server-side by Analytics and Responses pages and applied via `filterByArea`.

---

## 5. Validation (`src/lib/validation/survey.ts`)

Zod schemas generated **dynamically from `SURVEY_QUESTIONS`** (`questionSchemas`, keyed by question id) — so adding/removing a question in `surveyQuestions.ts` automatically updates both the client-side per-step validation and the server-side re-validation, no schema drift possible between the two.

- `validateSurveyProgressPayload` — lenient: shape + honeypot + per-answer validation, no "every required question answered" check (the customer is still mid-survey).
- `validateSurveyPayload` — strict: same, but used for the final submit. Honeypot tripped → generic rejection without revealing why. Server-side re-validation always runs regardless of what the client already checked — "never trust the client."

---

## 6. Known issues / things worth knowing before changing this code

### 6.1 `survey_version` hardcoded to `"v1"`
`src/lib/db/submissions.ts`'s `submissionFields.survey_version` is hardcoded to `"v1"`, even though `src/config/surveyQuestions.ts` now defines `SURVEY_VERSION = "v2"`. Every row currently being written is mislabeled. Harmless today (nothing reads this column back), but worth fixing before it's relied on for anything (e.g. filtering out old-schema submissions in a future migration).

### 6.2 `purchase_frequency` id collision (fixed 2026-09-30)
The pre-trim survey had separate top-level "demographic" fields literally named `area`, `age_group`, `purchase_frequency`, split out of the answers object before saving (`splitAnswersForSave` in `SurveyContainer.tsx`). The 5-question trim reintroduced `purchase_frequency` as a **real question with the same id** — every answer to "How often do you buy dry fruits?" was silently discarded before it ever reached the server. Fixed by letting it flow through as a normal core answer and deriving the denormalized column from it server-side, the same way `purchase_channel` already works. See `docs/dashboard-data-investigation.md` for the full trace.

### 6.3 Stale `questions`/`section` values
The `questions` table's `purchase_frequency` row still has `section = 'demographic'` from the original v1 seed (migration 0004), even though the app's live config marks it `section: "core"`. Not currently read anywhere (`questions`/`answer_options` are reference-only, per their own comment), so it's cosmetic — but a future feature that groups by `section` from the DB rather than from `surveyQuestions.ts` would get this wrong.

### 6.4 Dead `area`/`age_group` fields
No current question has id `area` or `age_group` — both were removed in the 0005 trim. The columns still exist on `survey_submissions`, `splitAnswersForSave` still splits them out of the answers object (harmlessly — they're just always `undefined` now), and the `AreaFilter` dropdown on Analytics/Responses currently filters against a column nothing ever populates. If area-based filtering is wanted again, either reintroduce a real "area" question, or repurpose e.g. IP-based/URL-param area tagging and populate the column some other way.

### 6.5 Dead `store_name` / `store_area` / `online_platform` columns
Denormalized mirrors of the old `q2_store_name` / `q2_store_area` / `q2_online_platform` questions, all removed in the trim. Still shown as "—" on the Responses detail page's summary strip forever unless those questions come back or the page is updated to drop them.

### 6.6 Live anon-`UPDATE` failure (unresolved as of 2026-09-30)
The single biggest live blocker: `anon` `UPDATE`s to `survey_submissions`/`survey_answers` report success but don't persist on the current Supabase project, despite the RLS policies being correctly defined in the migration files. This means **no submission has ever been marked `completed_at`**, and nothing past the very first survey step has ever actually saved, regardless of any app-code fix. Full reproduction + the SQL fix to run in Supabase's SQL Editor: `docs/dashboard-data-investigation.md`.

### 6.7 Dashboard now shows in-progress drafts by default
As of 2026-09-30, `/admin` and `/admin/responses` intentionally show **every** row (completed and in-progress), each tagged with a "Completed"/"In progress" badge — previously they silently excluded anything without `completed_at` set, which is what made the dashboard look empty despite 13 real rows existing. `/admin/analytics` is the one page that still filters to completed-only on purpose, since percentage/breakdown charts would otherwise be skewed by half-finished drafts.

---

## 7. Where to make common changes

| Want to... | Change |
|---|---|
| Add/remove/reorder a survey question | `src/config/surveyQuestions.ts` (`SURVEY_QUESTIONS`, `STEP_GROUPS`) — validation and rendering follow automatically. Also add a matching `supabase/migrations/000N_*.sql` to keep the `questions`/`answer_options` lookup tables in sync (see 0006 for the pattern: delete removed rows' answers/options/questions first, upsert kept/changed ones) |
| Change what counts as "offline" for the Dashboard % | `OFFLINE_CHANNELS` in `src/lib/analytics/aggregate.ts` |
| Add a new chart to Analytics | Add an aggregation function to `aggregate.ts`, wire it into `analytics/page.tsx` alongside the existing `ChartCard`s |
| Change what's in the CSV export | `CSV_COLUMNS` + `submissionToCsvRow` in `src/lib/analytics/csv.ts` |
| Add an area/demographic question back | Add it to `surveyQuestions.ts` with `section: "demographic"`; **do not** reuse `area`/`age_group`/`purchase_frequency` as the id unless you also update/remove the special-casing in `SurveyContainer.tsx`'s `splitAnswersForSave` — see §6.2 |
