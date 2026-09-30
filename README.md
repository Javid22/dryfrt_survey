# Dry Fruit Customer Research Survey

A mobile-first customer research web app for understanding everyday dry-fruit
buying behavior — where people buy, what matters most to them (quality,
price, customer experience, ambience, etc.), budget, and demand for
quick (10-minute) home delivery. This is a **research tool**, not a
storefront — no e-commerce or ordering functionality is included.
(Gift-box/occasion-gifting questions are on hold for now — see
`src/config/surveyQuestions.ts` if that focus comes back.)

## Overview

- Public survey (`/survey`) collects 15 core questions plus optional
  demographics, one question (or small related group) per screen, with a
  progress bar, back/forward navigation, and localStorage-backed drafts so a
  refresh never loses answers.
- Admin dashboard (`/admin`) — authenticated via Supabase Auth — shows live
  stats, analytics charts, competitor and pain-point analysis, a response
  browser, individual response pages, a "Customer Voice" open-text feed, and
  CSV export.
- All data lives in Supabase Postgres behind Row Level Security: anonymous
  visitors can only INSERT survey rows; only authenticated admins can SELECT.

## Tech Stack

- **Frontend:** Next.js (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4
- **UI:** hand-rolled shadcn/ui-style primitives (Radix UI primitives + `class-variance-authority` + `tailwind-merge`), `lucide-react` icons
- **Charts:** Recharts
- **Validation:** Zod (shared client + server schemas, generated from the survey question config)
- **Backend:** Supabase (Postgres, Row Level Security, Auth) — no separate Node backend
- **Testing:** Vitest + React Testing Library
- **Hosting:** Vercel (frontend) + Supabase (database/auth)

## Project Structure

```
src/
├── app/
│   ├── page.tsx                       Landing page
│   ├── robots.ts                      robots.txt (disallows /admin)
│   ├── survey/
│   │   ├── page.tsx                   Survey flow
│   │   ├── actions.ts                 Server Action: validates + inserts a submission
│   │   └── success/page.tsx           Thank-you page
│   ├── admin/
│   │   ├── login/page.tsx             Admin login (Suspense-wrapped LoginForm)
│   │   └── (dashboard)/               Route group sharing the authenticated admin chrome
│   │       ├── layout.tsx             Nav + sign-out, redirects to /admin/login if unauthenticated
│   │       ├── page.tsx               Dashboard (top stat cards)
│   │       ├── responses/page.tsx     Response list + area filter + CSV export
│   │       ├── responses/[id]/page.tsx  Full response detail
│   │       ├── analytics/page.tsx     Charts + competitor ranking
│   │       ├── voice/page.tsx         Open-ended "Customer Voice" feed
│   │       └── settings/page.tsx      Account + survey settings
│   └── api/admin/export/route.ts      CSV export route (auth-checked)
├── components/
│   ├── survey/                        SurveyContainer, SurveyQuestion, ProgressBar, NavigationButtons, ShareSurveyButton
│   ├── admin/                         DashboardCard, ResponseTable, AnalyticsChart, Filters, CustomerVoice, LoginForm, ChangePasswordForm
│   └── ui/                            Button, Card, Input, Textarea, RadioGroup, Checkbox, Select, Label, Progress, Badge, Table
├── lib/
│   ├── supabase/                      client.ts (browser), server.ts (SSR/server actions), middleware.ts (session refresh + route guard)
│   ├── db/submissions.ts              Centralized Supabase queries (insert/list/detail)
│   ├── validation/survey.ts           Zod schemas derived from the question config
│   └── analytics/                     aggregate.ts, normalizeStoreName.ts, csv.ts
├── types/                             survey.ts, database.ts (hand-written Supabase Database type)
├── config/surveyQuestions.ts          Single source of truth for all survey questions
└── middleware.ts                      Wires lib/supabase/middleware into Next's middleware
supabase/migrations/                   SQL migrations (schema + RLS policies)
tests/                                 Vitest + RTL test suite
```

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Visit `http://localhost:3000` for the survey and `http://localhost:3000/admin/login` for the admin panel.

## Supabase Setup

1. **Create a project** at [supabase.com](https://supabase.com).
2. **Run the migrations** — in the Supabase SQL Editor, run the files in
   `supabase/migrations/` in order:
   - `0001_create_survey_tables.sql` — creates `survey_submissions` and `survey_answers`
   - `0002_rls_policies.sql` — enables RLS and creates the anon-insert / authenticated-select policies

   Or via the Supabase CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. **Confirm RLS is enabled** on both tables (Database → Tables → RLS toggle) — the migration does this, but double-check in a fresh project.
4. **Create an admin user** — Authentication → Users → "Add user" (email + password), or:
   ```bash
   # one-off script only — never run this inside the deployed app
   # requires SUPABASE_SERVICE_ROLE_KEY, kept server-only / out of any client bundle
   npx supabase auth users create --email admin@example.com --password '...'
   ```
   Any user created this way can sign in at `/admin/login`; there's no separate admin-role table — every authenticated user is treated as an admin, since this is a single small internal tool. Restrict who gets a Supabase Auth account if you need finer-grained control later.
5. **Copy your project's URL and anon key** (Settings → API) into `.env.local` / your Vercel project's environment variables.

The running app never needs `SUPABASE_SERVICE_ROLE_KEY`. Admin reads (dashboard, analytics, responses, CSV export) go through the authenticated server-side Supabase client in `src/lib/supabase/server.ts`, relying entirely on the `authenticated`-role RLS policies in `0002_rls_policies.sql`.

## Environment Variables

See `.env.example`:

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | public — RLS is what actually protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | *(not used by the running app)* | server-only, optional; only for one-off admin-creation/seed scripts |

`.env.local` is git-ignored; commit only `.env.example`.

## Running Tests

```bash
npm test          # vitest run (CI mode, single pass)
npm run test:watch
```

The suite (`tests/`) covers:
- **Survey:** question navigation, back button, required-field validation, max-selection enforcement, conditional Q2 fields, the generic "exclusive option" behavior, mocked submission (success + failure), error handling (`tests/SurveyContainer.test.tsx`, `tests/SurveyQuestion.test.tsx`)
- **Validation:** Zod schema valid/invalid cases derived from the question config (`tests/validation.test.ts`)
- **Analytics:** dashboard stat computation, channel/problem aggregation, area filtering (`tests/aggregate.test.ts`)
- **CSV export:** row shaping + escaping (`tests/csv.test.ts`)
- **Admin:** login form behavior (`tests/AdminLogin.test.tsx`), protected-route redirect logic (`tests/middleware-guard.test.ts`)

## Design Decisions & Notes

- **Conditional questions & "exclusive option" behavior** are both handled generically on the `SurveyQuestion` config type (`conditional`, `exclusiveOptionValue`) rather than hardcoded per-question, so Q2's offline/online split and any future "none of the above"-style option share the same mechanism.
- **Q2** is modelled as three separate config entries (`q2_store_name`, `q2_store_area`, `q2_online_platform`), grouped into one screen via `STEP_GROUPS` in `src/config/surveyQuestions.ts`, so offline respondents see both store fields together and online respondents see just the platform field.
- **"Other" free-text answers** are stored as a synthetic `"<question_id>__other"` entry in `survey_answers`, keeping the main question's schema simple.
- **Denormalized columns** (`purchase_channel`, `store_name`, `store_area`, `online_platform`) on `survey_submissions` are populated at insert time from the same request as a fast-query mirror; `survey_answers` remains the source of truth for every question's answer.
- **Competitor name normalization** (`src/lib/analytics/normalizeStoreName.ts`) is a small, conservative JSON map for common variants (e.g. "Amazon.in" → "Amazon"). It intentionally does not attempt aggressive fuzzy matching — extend the map by hand as new spelling variants show up in real data.
- **Duplicate/spam prevention:** a hidden honeypot field and server-side Zod re-validation on every submission (never trust the client). There is deliberately no resubmission cooldown — the same customer is allowed to fill out the survey again any time.
- **No service role key needed** for normal operation — see the RLS section above.

## Deployment (Vercel + Supabase + GitHub)

1. **Push to GitHub**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Set up Supabase** — follow the "Supabase Setup" section above (new project, run migrations, confirm RLS, create an admin user).
3. **Create a Vercel project** — import the GitHub repo at [vercel.com/new](https://vercel.com/new).
4. **Configure environment variables** in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Leave `SUPABASE_SERVICE_ROLE_KEY` unset unless you have a specific server-only script that needs it.)
5. **Deploy.** Vercel builds with `next build` automatically.
6. **Test the production survey**: visit `https://<your-project>.vercel.app/survey`, submit a test response, then confirm it appears at `/admin/responses` after signing in at `/admin/login`.
7. **Custom domain (optional, later):** the app never hardcodes a domain — the WhatsApp share link and any origin-based logic use `window.location.origin` at runtime, so pointing a custom domain at the Vercel project just works.

## What Was Simplified vs. the Full Spec (and why)

- **shadcn/ui** components are hand-written in `src/components/ui/` (Radix primitives + `cva` + `tailwind-merge`, the same pattern the shadcn CLI generates) rather than pulled in via the `shadcn` CLI, to avoid CLI/registry network flakiness against a very new Next.js/React major version during this build.
- **Competitor name normalization** is a small hardcoded map (see above) rather than an admin-editable override UI/table — the spec explicitly allows this for v1.
- **Cross-table submission "transaction"**: if the `survey_answers` insert fails after `survey_submissions` succeeds, the app logs the error server-side and surfaces a generic failure to the customer, rather than implementing two-phase rollback — acceptable for v1 per the spec's own guidance.
- **Admin roles**: any authenticated Supabase user is an admin (no separate roles/permissions table) — reasonable for a small internal research tool with a handful of trusted users.
