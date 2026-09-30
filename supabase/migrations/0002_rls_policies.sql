-- Row Level Security for the survey tables.
-- Anonymous (customer-facing) role: INSERT only, no SELECT/UPDATE/DELETE.
-- Authenticated (admin) role: SELECT only, via the app's own auth. Writes
-- from the app are always done as anon (the survey submission flow), so
-- authenticated users don't need INSERT/UPDATE/DELETE policies either —
-- admins only ever read.

alter table survey_submissions enable row level security;
alter table survey_answers enable row level security;

-- Anonymous customers can create a submission...
drop policy if exists "anon can insert survey_submissions" on survey_submissions;
create policy "anon can insert survey_submissions"
    on survey_submissions
    for insert
    to anon
    with check (true);

-- ...and its answers.
drop policy if exists "anon can insert survey_answers" on survey_answers;
create policy "anon can insert survey_answers"
    on survey_answers
    for insert
    to anon
    with check (true);

-- Authenticated admins can read everything for the dashboard/analytics/export.
drop policy if exists "authenticated can select survey_submissions" on survey_submissions;
create policy "authenticated can select survey_submissions"
    on survey_submissions
    for select
    to authenticated
    using (auth.role() = 'authenticated');

drop policy if exists "authenticated can select survey_answers" on survey_answers;
create policy "authenticated can select survey_answers"
    on survey_answers
    for select
    to authenticated
    using (auth.role() = 'authenticated');

-- Anon UPDATE policies (needed so in-progress submissions can be saved one
-- step at a time) are added in 0003_incremental_progress.sql. No DELETE
-- policy for anon or authenticated: nobody, including the app, can delete a
-- customer's answers through the API.
