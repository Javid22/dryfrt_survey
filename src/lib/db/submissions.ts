import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  SubmissionDetail,
  SurveyAnswerDbRow,
  SurveyAnswers,
  SurveySubmission,
} from "@/types/survey";

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

export type InsertSubmissionInput = {
  answers: SurveyAnswers;
  startedAt: string;
  area?: string;
  ageGroup?: string;
  purchaseFrequency?: string;
  source?: string;
};

/**
 * Inserts a submission row, then one answer row per answered core question.
 * Uses the anon client relying on RLS insert policies — never the service
 * role key. If the answers insert fails after the submission succeeded, we
 * log it server-side (caller's responsibility) and accept the partial write
 * for v1 rather than adding cross-table transaction machinery.
 */
export async function insertSurveySubmission(
  client: Client,
  input: InsertSubmissionInput
): Promise<{ id: string }> {
  const purchaseChannel = derivePurchaseChannel(input.answers);

  const { data: submission, error: submissionError } = await client
    .from("survey_submissions")
    .insert({
      survey_version: "v1",
      source: input.source ?? "web",
      started_at: input.startedAt,
      completed_at: new Date().toISOString(),
      area: input.area ?? null,
      age_group: input.ageGroup ?? null,
      purchase_frequency: input.purchaseFrequency ?? null,
      purchase_channel: purchaseChannel,
      store_name: str(input.answers, "q2_store_name"),
      store_area: str(input.answers, "q2_store_area"),
      online_platform: str(input.answers, "q2_online_platform"),
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    throw new Error(submissionError?.message ?? "Failed to create submission.");
  }

  const rows = Object.entries(input.answers)
    .filter(([, value]) => value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0))
    .map(([question_id, value]) => ({
      submission_id: submission.id,
      question_id,
      answer_text: typeof value === "string" ? value : null,
      answer_json: Array.isArray(value) ? (value as unknown as Json) : null,
    }));

  if (rows.length > 0) {
    const { error: answersError } = await client.from("survey_answers").insert(rows);
    if (answersError) {
      // Submission row already exists; log and surface so caller can decide.
      console.error("survey_answers insert failed for submission", submission.id, answersError);
      throw new Error(answersError.message);
    }
  }

  return { id: submission.id as string };
}

export async function getAllSubmissions(client: Client): Promise<SurveySubmission[]> {
  const { data, error } = await client
    .from("survey_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SurveySubmission[];
}

export async function getAllAnswers(client: Client): Promise<SurveyAnswerDbRow[]> {
  const { data, error } = await client.from("survey_answers").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SurveyAnswerDbRow[];
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
    .select("*")
    .eq("submission_id", id);

  if (answersError) throw new Error(answersError.message);

  const answers: Record<string, SurveyAnswerDbRow> = {};
  for (const row of (answerRows ?? []) as unknown as SurveyAnswerDbRow[]) {
    answers[row.question_id] = row;
  }

  return { submission: submission as SurveySubmission, answers };
}
