-- Removes the lookup rows for four questions dropped from the customer
-- survey (src/config/surveyQuestions.ts): area, age_group,
-- q2_online_platform, favorite_dry_fruits. The app no longer sends these
-- question_ids, so no new survey_answers rows will reference them — this
-- just keeps the questions/answer_options lookup tables matching the live
-- config rather than leaving orphaned reference rows behind.
--
-- survey_answers.question_id references questions(id) with no cascade, so
-- any existing answers for these questions must go first (no real
-- production data exists yet — see 0004 — so this is safe here; if you're
-- past that point, back up first).

delete from survey_answers
where question_id in ('area', 'age_group', 'q2_online_platform', 'favorite_dry_fruits');

delete from answer_options
where question_id in ('area', 'age_group', 'q2_online_platform', 'favorite_dry_fruits');

delete from questions
where id in ('area', 'age_group', 'q2_online_platform', 'favorite_dry_fruits');
