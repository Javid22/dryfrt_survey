"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertSurveySubmission } from "@/lib/db/submissions";
import { validateSurveyPayload, validateSurveyProgressPayload } from "@/lib/validation/survey";
import type { SurveyProgressPayload, SurveySubmissionPayload } from "@/types/survey";

export type SubmitSurveyResult =
  | { success: true; id: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type SaveProgressResult =
  | { success: true; id: string; savedAnswerKeys: string[] }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_ERROR =
  "Something went wrong while submitting your response. Please check your internet connection and try again.";

/**
 * Server Action that validates the survey payload again (never trust the
 * client) and writes it to Supabase using the anon client — RLS insert/
 * update policies grant the anon role INSERT + UPDATE on survey_submissions
 * / survey_answers, so no service role key is needed here.
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
    const { id } = await upsertSurveySubmission(supabase, {
      submissionId: payload.submissionId,
      answers: validation.data.answers,
      previouslySavedAnswerKeys: validation.data.previouslySavedAnswerKeys,
      startedAt: validation.data.startedAt,
      area: validation.data.area,
      ageGroup: validation.data.ageGroup,
      purchaseFrequency: validation.data.purchaseFrequency,
      isComplete: true,
    });
    return { success: true, id };
  } catch (err) {
    // Never leak raw DB errors to the customer; log server-side only.
    console.error("submitSurvey failed:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/**
 * Server Action fired on every "Next" click (not just the final submit) so
 * the customer's answers are saved one question group at a time: the first
 * call creates the (incomplete) submission row and returns its id, and every
 * later call — carrying that same id plus `previouslySavedAnswerKeys` back
 * — updates it and writes whatever new or changed answers were given.
 * Returns the updated `savedAnswerKeys` list so the client can track it for
 * the next call. Validation here is deliberately lenient (shape + per-answer
 * checks only, no "every required question answered" pass) since the
 * customer is still mid-survey.
 */
export async function saveSurveyProgress(payload: SurveyProgressPayload): Promise<SaveProgressResult> {
  const validation = validateSurveyProgressPayload(payload);

  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.issues) {
      fieldErrors[issue.questionId] = issue.message;
    }
    return { success: false, error: "Please review your answers and try again.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { id, savedAnswerKeys } = await upsertSurveySubmission(supabase, {
      submissionId: validation.data.submissionId,
      answers: validation.data.answers,
      previouslySavedAnswerKeys: validation.data.previouslySavedAnswerKeys,
      stepQuestionIds: validation.data.stepQuestionIds,
      startedAt: validation.data.startedAt,
      area: validation.data.area,
      ageGroup: validation.data.ageGroup,
      purchaseFrequency: validation.data.purchaseFrequency,
    });
    return { success: true, id, savedAnswerKeys };
  } catch (err) {
    console.error("saveSurveyProgress failed:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
