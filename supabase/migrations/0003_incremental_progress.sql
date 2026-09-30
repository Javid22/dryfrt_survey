-- Incremental survey progress: the survey now saves one question group at a
-- time (on every "Next", not just the final "Submit"), so a submission row
-- is created on the first step and then updated in place as the customer
-- answers more questions. That requires anon UPDATE, in addition to the
-- existing anon INSERT, on both tables — upserting survey_answers relies on
-- ON CONFLICT DO UPDATE, which needs UPDATE privileges too.
--
-- This keeps the same trust model as the existing INSERT policies (anon has
-- no identity to scope "own row" to, so any request can insert/update any
-- row — acceptable for an anonymous public survey with no auth).

drop policy if exists "anon can update survey_submissions" on survey_submissions;
create policy "anon can update survey_submissions"
    on survey_submissions
    for update
    to anon
    using (true)
    with check (true);

drop policy if exists "anon can update survey_answers" on survey_answers;
create policy "anon can update survey_answers"
    on survey_answers
    for update
    to anon
    using (true)
    with check (true);
