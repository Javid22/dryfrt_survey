import { z } from "zod";
import { SURVEY_QUESTIONS } from "@/config/surveyQuestions";
import type { SurveyQuestion } from "@/types/survey";

const SHORT_TEXT_MAX = 300;
const LONG_TEXT_MAX = 1000;

/** Friendly messages reused across single/multi validators. */
const MESSAGES = {
  requiredSingle: "Please choose an option.",
  requiredMulti: "Please choose at least one option.",
  tooMany: (n: number) => `Please choose no more than ${n} options.`,
  tooLongShort: `Please keep this under ${SHORT_TEXT_MAX} characters.`,
  tooLongLong: `Please keep this under ${LONG_TEXT_MAX} characters.`,
};

const honeypotSchema = z.string().max(0).optional().or(z.literal(""));

/** Builds a Zod schema for a single question's answer based on its config. */
function schemaForQuestion(q: SurveyQuestion): z.ZodTypeAny {
  const maxLen = q.maxLength ?? (q.type === "textarea" ? LONG_TEXT_MAX : SHORT_TEXT_MAX);
  const tooLongMsg = q.type === "textarea" ? MESSAGES.tooLongLong : MESSAGES.tooLongShort;

  if (q.type === "text" || q.type === "textarea") {
    const base = z.string().max(maxLen, { message: tooLongMsg });
    if (!q.required) return base.optional();
    // Preprocess undefined -> "" so an unanswered required field fails with
    // our friendly "required" message instead of a generic type error.
    return z.preprocess((v) => v ?? "", base.min(1, { message: MESSAGES.requiredSingle }));
  }

  if (q.type === "single") {
    const base = z.string().max(SHORT_TEXT_MAX);
    if (!q.required) return base.optional();
    return z.preprocess((v) => v ?? "", base.min(1, { message: MESSAGES.requiredSingle }));
  }

  // multiple
  let arr = z.array(z.string().max(SHORT_TEXT_MAX));
  if (q.maxSelections) {
    arr = arr.max(q.maxSelections, { message: MESSAGES.tooMany(q.maxSelections) });
  }
  if (q.required) {
    arr = arr.min(1, { message: MESSAGES.requiredMulti });
  }
  return arr.optional();
}

/** Full map of per-question zod schemas, derived from the config (single source of truth). */
export const questionSchemas: Record<string, z.ZodTypeAny> = Object.fromEntries(
  SURVEY_QUESTIONS.map((q) => [q.id, schemaForQuestion(q)])
);

/**
 * Server-side payload schema for the whole submission. Answers are validated
 * loosely here (any known question id -> string | string[]) and then each
 * value is re-validated against its specific question schema in
 * `validateSurveyPayload` so we get precise, per-question error messages.
 */
export const surveySubmissionSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  startedAt: z.string().min(1),
  area: z.string().max(SHORT_TEXT_MAX).optional(),
  ageGroup: z.string().max(SHORT_TEXT_MAX).optional(),
  purchaseFrequency: z.string().max(SHORT_TEXT_MAX).optional(),
  website: honeypotSchema, // honeypot: must be empty
  /** Answer keys the client already knows have a survey_answers row, from an earlier "save progress" call. */
  previouslySavedAnswerKeys: z.array(z.string()).optional(),
});

export type SurveySubmissionInput = z.infer<typeof surveySubmissionSchema>;

/**
 * Same shape as the final submission, plus the id of the in-progress
 * submission being resumed (absent on the very first save). Used for the
 * step-by-step "save as you go" writes, so it's a superset of the final
 * schema rather than a stricter one.
 */
export const surveyProgressSchema = surveySubmissionSchema.extend({
  submissionId: z.string().uuid().optional(),
  stepQuestionIds: z.array(z.string()).optional(),
});

export type SurveyProgressInput = z.infer<typeof surveyProgressSchema>;

export type ProgressValidationResult =
  | { success: true; data: SurveyProgressInput }
  | { success: false; issues: ValidationIssue[] };

/**
 * Validates a partial, in-progress payload: shape + honeypot only. Unlike
 * `validateSurveyPayload`, this deliberately skips the "is every required
 * question answered" pass — the customer may only have answered the
 * question group they just clicked Next on, and later steps are still
 * blank. Per-question schemas (max length / max selections) still apply to
 * whatever answers were actually provided.
 */
export function validateSurveyProgressPayload(payload: unknown): ProgressValidationResult {
  const parsed = surveyProgressSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((i) => ({
        questionId: String(i.path[0] ?? "form"),
        message: i.message,
      })),
    };
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: false, issues: [{ questionId: "website", message: "Invalid submission." }] };
  }

  const issues: ValidationIssue[] = [];
  for (const [questionId, value] of Object.entries(parsed.data.answers)) {
    const schema = questionSchemas[questionId];
    if (!schema) continue; // unknown question id -> ignore rather than reject the whole save
    const result = schema.safeParse(value);
    if (!result.success) {
      issues.push({
        questionId,
        message: result.error.issues[0]?.message ?? "Invalid answer.",
      });
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: parsed.data };
}

export type ValidationIssue = { questionId: string; message: string };

export type ValidationResult =
  | { success: true; data: SurveySubmissionInput }
  | { success: false; issues: ValidationIssue[] };

/**
 * Validates a submission payload: honeypot + top-level shape first, then
 * every required core question, then any answer that was actually provided
 * against its own schema (max selections / max length).
 */
export function validateSurveyPayload(payload: unknown): ValidationResult {
  const parsed = surveySubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      issues: parsed.error.issues.map((i) => ({
        questionId: String(i.path[0] ?? "form"),
        message: i.message,
      })),
    };
  }

  // Honeypot tripped -> treat as spam, but don't reveal why to a bot.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: false, issues: [{ questionId: "website", message: "Invalid submission." }] };
  }

  const issues: ValidationIssue[] = [];
  const answers = parsed.data.answers;

  for (const q of SURVEY_QUESTIONS) {
    if (q.section !== "core") continue; // demographics are always optional
    if (isConditionallyHidden(q, answers)) continue;

    const schema = questionSchemas[q.id];
    const value = answers[q.id];
    const result = schema.safeParse(value);
    if (!result.success) {
      issues.push({
        questionId: q.id,
        message: result.error.issues[0]?.message ?? "Invalid answer.",
      });
    }
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return { success: true, data: parsed.data };
}

function isConditionallyHidden(
  q: SurveyQuestion,
  answers: Record<string, string | string[]>
): boolean {
  if (!q.conditional) return false;
  const parentAnswer = answers[q.conditional.questionId];
  if (typeof parentAnswer !== "string") return true;
  return !q.conditional.values.includes(parentAnswer);
}
