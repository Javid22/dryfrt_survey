-- Dry Fruit Customer Research Survey — initial schema (v1)
-- survey_answers is the source of truth for every Q1-Q12 answer (one row per
-- question_id per submission). Denormalized columns on survey_submissions
-- (purchase_channel, store_name, store_area, online_platform) are fast-query
-- mirrors populated at insert time from the same request, used purely for
-- dashboard/competitor/export aggregation so we don't have to re-parse
-- survey_answers on every read.

create extension if not exists "pgcrypto";

create table if not exists survey_submissions (
    id uuid primary key default gen_random_uuid(),
    survey_version varchar(20) not null default 'v1',
    source varchar(50),
    started_at timestamptz,
    completed_at timestamptz,
    area varchar(100),
    age_group varchar(50),
    purchase_frequency varchar(100),

    -- Denormalized mirrors of Q1/Q2 answers, for fast dashboard aggregation.
    -- survey_answers remains the source of truth for these questions.
    purchase_channel varchar(50),
    store_name text,
    store_area text,
    online_platform text,

    created_at timestamptz not null default now()
);

create table if not exists survey_answers (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references survey_submissions(id) on delete cascade,
    question_id varchar(50) not null,
    answer_text text,
    answer_json jsonb,
    created_at timestamptz not null default now(),

    constraint survey_answers_one_submission_per_question unique (submission_id, question_id)
);

create index if not exists idx_survey_submissions_created_at on survey_submissions (created_at desc);
create index if not exists idx_survey_submissions_area on survey_submissions (area);
create index if not exists idx_survey_submissions_purchase_channel on survey_submissions (purchase_channel);
create index if not exists idx_survey_answers_submission_id on survey_answers (submission_id);
create index if not exists idx_survey_answers_question_id on survey_answers (question_id);
