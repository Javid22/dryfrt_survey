"use server";

import { createClient } from "@/lib/supabase/server";
import { insertSurveySubmission } from "@/lib/db/submissions";
import { validateSurveyPayload } from "@/lib/validation/survey";
import type { SurveySubmissionPayload } from "@/types/survey";

export type SubmitSurveyResult =
  | { success: true; id: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_ERROR =
  "Something went wrong while submitting your response. Please check your internet connection and try again.";

/**
 * Server Action that validates the survey payload again (never trust the
 * client) and writes it to Supabase using the anon client — RLS insert
 * policies grant the anon role INSERT-only on survey_submissions /
 * survey_answers, so no service role key is needed here.
 */
export async function submitSurvey(payload: SurveySubmissionPayload): Promise<SubmitSurveyResult> {
  const validation = validateSurveyPayload(payload);

  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.issues) {
      fieldErrors[issue.questionId] = issue.message;
    }
    return { success: false, error: "Please review your answers and try again.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { id } = await insertSurveySubmission(supabase, {
      answers: validation.data.answers,
      startedAt: validation.data.startedAt,
      area: validation.data.area,
      ageGroup: validation.data.ageGroup,
      purchaseFrequency: validation.data.purchaseFrequency,
    });
    return { success: true, id };
  } catch (err) {
    // Never leak raw DB errors to the customer; log server-side only.
    console.error("submitSurvey failed:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
