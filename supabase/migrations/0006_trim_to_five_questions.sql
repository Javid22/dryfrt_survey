-- Trims the survey down to 5 questions (from the ~15-16 question v1 set):
-- q1_purchase_channel, top_priorities (new, merges the old purchase-reasons
-- + primary-factor questions), monthly_budget (new tiers), purchase_frequency
-- (unchanged), and improvement_feedback (new, merges three old open-text
-- questions into one, with tap-to-fill suggestions handled client-side).
--
-- Every statement here is written to be safely re-runnable (DELETE of
-- specific rows, or INSERT ... ON CONFLICT DO UPDATE) — this replaces an
-- earlier, broken version of this migration that deleted *all* of
-- q1_purchase_channel's/monthly_budget's option rows (including ones being
-- kept, like "supermarket") before re-inserting them, which violated the
-- survey_answers FK for any answer already pointing at a kept option in
-- that gap. If that broken version got partway through on your database,
-- just run this corrected file — nothing here assumes a particular
-- starting point.

-- ---------------------------------------------------------------------
-- Fully removed questions: q2_store_name, q2_store_area, q3_purchase_reasons,
-- primary_factor, q4_likes_most, q5_dislikes, improvement_priority,
-- q6_change_one_thing, pack_size_preference, quick_delivery_interest,
-- subscription_interest, q11_switch_reasons, q12_owner_suggestion.
-- No real production data exists yet (see 0004/0005), so clearing their
-- answers is safe.
-- ---------------------------------------------------------------------

delete from survey_answers
where question_id in (
  'q2_store_name', 'q2_store_area', 'q3_purchase_reasons', 'primary_factor',
  'q4_likes_most', 'q5_dislikes', 'improvement_priority', 'q6_change_one_thing',
  'pack_size_preference', 'quick_delivery_interest', 'subscription_interest',
  'q11_switch_reasons', 'q12_owner_suggestion'
);

delete from answer_options
where question_id in (
  'q3_purchase_reasons', 'primary_factor', 'q5_dislikes', 'improvement_priority',
  'pack_size_preference', 'quick_delivery_interest', 'subscription_interest',
  'q11_switch_reasons'
);

delete from questions
where id in (
  'q2_store_name', 'q2_store_area', 'q3_purchase_reasons', 'primary_factor',
  'q4_likes_most', 'q5_dislikes', 'improvement_priority', 'q6_change_one_thing',
  'pack_size_preference', 'quick_delivery_interest', 'subscription_interest',
  'q11_switch_reasons', 'q12_owner_suggestion'
);

-- ---------------------------------------------------------------------
-- q1_purchase_channel: kept, but drops the "WhatsApp/Instagram seller"
-- option and reworded a couple of labels. Edited in place — only the one
-- removed option is ever deleted; the kept ones are upserted, never
-- dropped, so an existing answer pointing at "supermarket" (etc.) never
-- has its FK target disappear even momentarily.
-- ---------------------------------------------------------------------

delete from survey_answers
where question_id = 'q1_purchase_channel' and option_id = 'whatsapp_instagram';
delete from answer_options
where question_id = 'q1_purchase_channel' and value = 'whatsapp_instagram';

insert into answer_options (question_id, value, label, sort_order) values
  ('q1_purchase_channel', 'local_shop', 'Local dry-fruit shop', 1),
  ('q1_purchase_channel', 'supermarket', 'Supermarket', 2),
  ('q1_purchase_channel', 'online', 'Online (website or app)', 3),
  ('q1_purchase_channel', 'wholesale_market', 'Wholesale market', 4),
  ('q1_purchase_channel', 'dont_buy', 'I don''t buy dry fruits', 5),
  ('q1_purchase_channel', 'other', 'Other', 6)
on conflict (question_id, value) do update set label = excluded.label, sort_order = excluded.sort_order;

update questions set sort_order = 1 where id = 'q1_purchase_channel';

-- ---------------------------------------------------------------------
-- monthly_budget: kept, drops the 2,000-5,000 band and the old "Above
-- ₹5,000" tier, replaced by a single "Above ₹2,000" tier. Same in-place
-- pattern as above.
-- ---------------------------------------------------------------------

delete from survey_answers
where question_id = 'monthly_budget' and option_id in ('2000_5000', 'above_5000');
delete from answer_options
where question_id = 'monthly_budget' and value in ('2000_5000', 'above_5000');

insert into answer_options (question_id, value, label, sort_order) values
  ('monthly_budget', 'under_500', 'Under ₹500', 1),
  ('monthly_budget', '500_1000', '₹500 – ₹1,000', 2),
  ('monthly_budget', '1000_2000', '₹1,000 – ₹2,000', 3),
  ('monthly_budget', 'above_2000', 'Above ₹2,000', 4),
  ('monthly_budget', 'only_during_festivals_occasions', 'Only on festivals', 5)
on conflict (question_id, value) do update set label = excluded.label, sort_order = excluded.sort_order;

update questions set sort_order = 3 where id = 'monthly_budget';
update questions set sort_order = 4 where id = 'purchase_frequency';

-- ---------------------------------------------------------------------
-- New questions: top_priorities (merges old purchase-reasons + primary
-- factor), improvement_feedback (merges three old open-text questions).
-- ---------------------------------------------------------------------

insert into questions (id, prompt, type, section, required, sort_order) values
  ('top_priorities', 'What matters most to you when choosing where to buy?', 'multiple', 'core', false, 2),
  ('improvement_feedback', 'Is there anything you''d like to change about how you buy dry fruits?', 'textarea', 'core', false, 5)
on conflict (id) do update set prompt = excluded.prompt, type = excluded.type, sort_order = excluded.sort_order;

insert into answer_options (question_id, value, label, sort_order) values
  ('top_priorities', 'price', 'Low price', 1),
  ('top_priorities', 'quality', 'Good quality', 2),
  ('top_priorities', 'trust', 'I trust the shop', 3),
  ('top_priorities', 'convenience', 'Easy to reach', 4),
  ('top_priorities', 'service', 'Good service', 5),
  ('top_priorities', 'other', 'Other', 6)
on conflict (question_id, value) do update set label = excluded.label, sort_order = excluded.sort_order;
