import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  SubmissionDetail,
  SurveyAnswerDbRow,
  SurveyAnswers,
  SurveySubmission,
} from "@/types/survey";
import { buildAnswerRows, parseAnswerKey } from "@/lib/survey/answerRows";

type Client = SupabaseClient<Database>;

/** Maps Q1's answer to the denormalized purchase_channel mirror column. */
function derivePurchaseChannel(answers: SurveyAnswers): string | null {
  const v = answers["q1_purchase_channel"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function str(answers: SurveyAnswers, id: string): string | null {
  const v = answers[id];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export type UpsertSubmissionInput = {
  /** Id of an in-progress submission created by an earlier step; omitted on the very first save. */
  submissionId?: string;
  answers: SurveyAnswers;
  /**
   * Answer keys the caller already knows have a survey_answers row (from an
   * earlier successful save of this same submission). See
   * src/lib/survey/answerRows.ts for the key format. Anything not in this
   * list is treated as brand new.
   */
  previouslySavedAnswerKeys?: string[];
  /**
   * question_ids to actually write this call. When given, only these
   * questions' rows are inserted/updated/deselected — everything else in
   * `answers` is used only to derive the denormalized submission columns
   * below, not reprocessed. Omit to process every question in `answers`
   * (used for the final submit, which needs a full consistency pass).
   */
  stepQuestionIds?: string[];
  startedAt: string;
  area?: string;
  ageGroup?: string;
  purchaseFrequency?: string;
  source?: string;
  /** Set once the customer reaches and passes the final step. Leaves completed_at null otherwise. */
  isComplete?: boolean;
};

/**
 * Creates the submission row on the first save (no submissionId yet), or
 * updates it in place on every later one — plus writes one survey_answers
 * row per single/text answer and one row per selected option of a
 * multi-select answer, so the survey is saved question-group by question-
 * group as the customer clicks Next, not only at the very end. Uses the
 * anon client relying on RLS insert/update policies — never the service
 * role key.
 *
 * Deliberately never does an upsert, a `.select()`/RETURNING, or a DELETE:
 *   - `INSERT ... ON CONFLICT DO UPDATE` needs to look up whether a
 *     conflicting row already exists, and in Postgres that lookup is gated
 *     by the table's SELECT policy — which anon has none of, by design, so
 *     customers can't read back anyone's answers.
 *   - Likewise `INSERT ... RETURNING` is filtered through SELECT policies.
 *   - anon has no DELETE policy either (nobody, including the app, can
 *     delete a customer's answers through the API).
 * So the caller tells us which answer keys already have a row
 * (`previouslySavedAnswerKeys`, tracked client-side across "Next" clicks)
 * and we do a plain INSERT for the rest, a plain UPDATE (by submission_id +
 * question_id + option_id, no RETURNING) to re-select/refresh ones that
 * already exist, and a plain UPDATE setting is_selected = false for any
 * previously-saved key that's no longer in the current answers (a
 * deselected multi-select option, or a cleared single/text field) —
 * "soft delete" instead of DELETE.
 *
 * `stepQuestionIds`, when given, scopes all of that to just the current
 * screen's question(s) instead of every question answered so far — without
 * it, a save late in the survey would re-send an UPDATE for every earlier
 * answer too, adding a network round trip per prior question. The
 * remaining writes (new-row insert, re-select updates, deselect updates)
 * touch disjoint rows, so they run concurrently rather than one at a time.
 *
 * If the answers write fails after the submission write succeeded, we log
 * it server-side (caller's responsibility) and accept the partial write for
 * v1 rather than adding cross-table transaction machinery.
 */
export async function upsertSurveySubmission(
  client: Client,
  input: UpsertSubmissionInput
): Promise<{ id: string; savedAnswerKeys: string[] }> {
  const purchaseChannel = derivePurchaseChannel(input.answers);

  const submissionFields = {
    survey_version: "v1",
    source: input.source ?? "web",
    started_at: input.startedAt,
    completed_at: input.isComplete ? new Date().toISOString() : null,
    area: input.area ?? null,
    age_group: input.ageGroup ?? null,
    // Mirrors purchase_channel above: derived straight from the answer to
    // the "purchase_frequency" question (falls back to the now-unused
    // input.purchaseFrequency field for any caller that still sends it).
    purchase_frequency: str(input.answers, "purchase_frequency") ?? input.purchaseFrequency ?? null,
    purchase_channel: purchaseChannel,
    store_name: str(input.answers, "q2_store_name"),
    store_area: str(input.answers, "q2_store_area"),
    online_platform: str(input.answers, "q2_online_platform"),
  };

  /** Thrown when an UPDATE against an existing submissionId turns out to reference a row that no longer exists. */
  class StaleSubmissionError extends Error {}

  /** Writes the submission row (insert if isNew, else update) plus its answer rows, against a specific id. */
  async function writeSubmissionAndAnswers(
    id: string,
    isNew: boolean,
    savedKeys: string[]
  ): Promise<{ id: string; savedAnswerKeys: string[] }> {
    if (isNew) {
      // Generate the id ourselves and insert it explicitly, rather than
      // relying on the column default + reading it back via `.select()`
      // (which would hit the RLS-needs-a-SELECT-policy problem noted above).
      const { error } = await client.from("survey_submissions").insert({ id, ...submissionFields });
      if (error) throw new Error(error.message);
    } else {
      // Never blank out completed_at once it's set — a stray progress save
      // (e.g. a duplicate request) firing after the final submit shouldn't
      // "un-complete" a finished response.
      const updateFields = input.isComplete
        ? submissionFields
        : { ...submissionFields, completed_at: undefined };
      const { error } = await client.from("survey_submissions").update(updateFields).eq("id", id);
      if (error) throw new Error(error.message);
      // Note: we deliberately don't check "how many rows did that UPDATE
      // touch" here (e.g. via `count: 'exact'`) — verified directly that
      // Postgres/PostgREST's exact-count for an UPDATE is *also* gated by
      // the missing anon SELECT policy and always reports 0, even for a
      // row that was genuinely just updated. So a stale/deleted id is
      // instead detected below, from the one write that can't silently
      // match zero rows: inserting its answers.
    }

    const alreadySaved = new Set(savedKeys);
    const allRows = buildAnswerRows(input.answers);
    // Scope to stepQuestionIds when given — everything else in `answers`
    // was only needed above for the denormalized submission columns.
    const scope = input.stepQuestionIds ? new Set(input.stepQuestionIds) : null;
    const currentRows = scope ? allRows.filter((r) => scope.has(r.question_id)) : allRows;
    const currentKeys = new Set(currentRows.map((r) => r.key));

    const rowsToInsert = currentRows.filter((r) => !alreadySaved.has(r.key));
    const rowsToReselect = currentRows.filter((r) => alreadySaved.has(r.key));
    // Only consider a previously-saved key "deselected" if it belongs to a
    // question actually in scope for this call — otherwise every question
    // from earlier screens would look deselected on every subsequent save.
    const deselectedKeys = [...alreadySaved].filter((k) => {
      if (currentKeys.has(k)) return false;
      const { question_id } = parseAnswerKey(k);
      return scope ? scope.has(question_id) : true;
    });

    // These three writes touch disjoint rows (insert: never-seen keys;
    // re-select: already-saved keys still present; deselect: already-saved
    // keys no longer present), so they run concurrently instead of adding
    // a network round trip each.
    const writes: PromiseLike<void>[] = [];

    if (rowsToInsert.length > 0) {
      writes.push(
        client
          .from("survey_answers")
          .insert(
            rowsToInsert.map((r) => ({
              submission_id: id,
              question_id: r.question_id,
              option_id: r.option_id,
              answer_text: r.answer_text,
              is_selected: true,
            }))
          )
          .then(({ error }) => {
            if (error) {
              if (!isNew && error.code === "23503") {
                // Foreign key violation on submission_id -> the submission
                // we just "updated" doesn't actually exist (deleted
                // independently, or a stale id from a browser draft that
                // outlived a schema reset). Unambiguous, unlike the
                // UPDATE's silent 0-rows-matched.
                throw new StaleSubmissionError(error.message);
              }
              console.error("survey_answers insert failed for submission", id, error);
              throw new Error(error.message);
            }
          })
      );
    }

    for (const row of rowsToReselect) {
      let query = client
        .from("survey_answers")
        .update({ answer_text: row.answer_text, is_selected: true })
        .eq("submission_id", id)
        .eq("question_id", row.question_id);
      query = row.option_id === null ? query.is("option_id", null) : query.eq("option_id", row.option_id);
      writes.push(
        query.then(({ error }) => {
          if (error) {
            console.error("survey_answers re-select failed for submission", id, row.key, error);
            throw new Error(error.message);
          }
        })
      );
    }

    for (const key of deselectedKeys) {
      const { question_id, option_id } = parseAnswerKey(key);
      let query = client
        .from("survey_answers")
        .update({ is_selected: false })
        .eq("submission_id", id)
        .eq("question_id", question_id);
      query = option_id === null ? query.is("option_id", null) : query.eq("option_id", option_id);
      writes.push(
        query.then(({ error }) => {
          if (error) {
            console.error("survey_answers deselect failed for submission", id, key, error);
            throw new Error(error.message);
          }
        })
      );
    }

    await Promise.all(writes);

    const savedAnswerKeys = Array.from(new Set([...alreadySaved, ...rowsToInsert.map((r) => r.key)]));
    return { id, savedAnswerKeys };
  }

  if (input.submissionId) {
    try {
      return await writeSubmissionAndAnswers(input.submissionId, false, input.previouslySavedAnswerKeys ?? []);
    } catch (err) {
      if (!(err instanceof StaleSubmissionError)) throw err;
      console.warn("upsertSurveySubmission: submissionId not found, creating a new submission", input.submissionId);
      // fall through to the fresh-submission path below, discarding the
      // stale previouslySavedAnswerKeys (none of those rows exist either)
    }
  }

  return writeSubmissionAndAnswers(randomUUID(), true, []);
}

/** Raw survey_answers row shape, as actually stored (normalized: one row per question, or per selected option). */
type RawAnswerRow = {
  submission_id: string;
  question_id: string;
  option_id: string | null;
  answer_text: string | null;
  created_at: string;
};

/**
 * Reconstructs the "one logical answer per question" shape the rest of the
 * app (analytics, CSV export, admin response view) already expects, from
 * the normalized rows actually stored: a single row with option_id set is a
 * single-select answer (its value goes to answer_text, matching the old
 * convention of answer_text holding the raw option value); a single row
 * with option_id null is a free-text answer; multiple rows for the same
 * question are a multi-select answer (their option_ids become answer_json).
 */
function groupAnswerRows(rows: RawAnswerRow[]): Map<string, SurveyAnswerDbRow[]> {
  const bySubmission = new Map<string, Map<string, RawAnswerRow[]>>();
  for (const row of rows) {
    let byQuestion = bySubmission.get(row.submission_id);
    if (!byQuestion) {
      byQuestion = new Map();
      bySubmission.set(row.submission_id, byQuestion);
    }
    const group = byQuestion.get(row.question_id) ?? [];
    group.push(row);
    byQuestion.set(row.question_id, group);
  }

  const result = new Map<string, SurveyAnswerDbRow[]>();
  for (const [submissionId, byQuestion] of bySubmission) {
    const answers: SurveyAnswerDbRow[] = [];
    for (const [questionId, group] of byQuestion) {
      const first = group[0];
      if (group.length > 1) {
        answers.push({
          id: first.submission_id + ":" + questionId,
          submission_id: submissionId,
          question_id: questionId,
          answer_text: null,
          answer_json: group.map((r) => r.option_id).filter((v): v is string => v !== null),
          created_at: first.created_at,
        });
      } else if (first.option_id !== null) {
        answers.push({
          id: first.submission_id + ":" + questionId,
          submission_id: submissionId,
          question_id: questionId,
          answer_text: first.option_id,
          answer_json: null,
          created_at: first.created_at,
        });
      } else {
        answers.push({
          id: first.submission_id + ":" + questionId,
          submission_id: submissionId,
          question_id: questionId,
          answer_text: first.answer_text,
          answer_json: null,
          created_at: first.created_at,
        });
      }
    }
    result.set(submissionId, answers);
  }
  return result;
}

/**
 * Fetches every submission, completed or still in progress. Admin pages
 * that only want to represent finished surveys (e.g. the Analytics charts)
 * should filter with `filterCompleted` from src/lib/analytics/aggregate.ts
 * rather than expecting this to have done it for them.
 */
export async function getAllSubmissions(client: Client): Promise<SurveySubmission[]> {
  const { data, error } = await client
    .from("survey_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SurveySubmission[];
}

/** Every saved answer, for completed submissions and in-progress drafts alike. */
export async function getAllAnswers(client: Client): Promise<SurveyAnswerDbRow[]> {
  const { data, error } = await client
    .from("survey_answers")
    .select("submission_id, question_id, option_id, answer_text, created_at")
    .eq("is_selected", true);
  if (error) throw new Error(error.message);

  const grouped = groupAnswerRows((data ?? []) as RawAnswerRow[]);
  return Array.from(grouped.values()).flat();
}

export async function getSubmissionDetail(
  client: Client,
  id: string
): Promise<SubmissionDetail | null> {
  const { data: submission, error: submissionError } = await client
    .from("survey_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (submissionError) throw new Error(submissionError.message);
  if (!submission) return null;

  const { data: answerRows, error: answersError } = await client
    .from("survey_answers")
    .select("submission_id, question_id, option_id, answer_text, created_at")
    .eq("submission_id", id)
    .eq("is_selected", true);

  if (answersError) throw new Error(answersError.message);

  const grouped = groupAnswerRows((answerRows ?? []) as RawAnswerRow[]);
  const answers: Record<string, SurveyAnswerDbRow> = {};
  for (const row of grouped.get(id) ?? []) {
    answers[row.question_id] = row;
  }

  return { submission: submission as SurveySubmission, answers };
}
