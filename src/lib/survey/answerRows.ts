import { getQuestionById } from "@/config/surveyQuestions";
import type { SurveyAnswers } from "@/types/survey";

/** Suffix SurveyContainer appends for an "Other, please specify" free-text field: `${questionId}__other`. */
const OTHER_SUFFIX = "__other";

export type ParsedAnswerRow = {
  /**
   * Stable key used to decide insert-vs-update and to detect a deselected
   * answer: bare question_id for single/text answers (exactly one row ever
   * exists per question), "questionId::optionValue" for one selected
   * option of a multi-select question (one row per selected option).
   */
  key: string;
  question_id: string;
  option_id: string | null;
  answer_text: string | null;
};

/**
 * Turns the client's flat SurveyAnswers map (question_id -> string |
 * string[], plus a "questionId__other" entry for any "Other, please
 * specify" free text) into the normalized rows survey_answers actually
 * stores. The "Other" free text is folded onto the same row as the
 * option_id = 'other' selection rather than becoming its own fake question
 * (which would have no matching row in the `questions` lookup table).
 */
export function buildAnswerRows(answers: SurveyAnswers): ParsedAnswerRow[] {
  const otherTextByQuestion: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (key.endsWith(OTHER_SUFFIX) && typeof value === "string" && value.trim()) {
      otherTextByQuestion[key.slice(0, -OTHER_SUFFIX.length)] = value.trim();
    }
  }

  const rows: ParsedAnswerRow[] = [];

  for (const [questionId, value] of Object.entries(answers)) {
    if (questionId.endsWith(OTHER_SUFFIX)) continue; // folded into its parent question's row above

    const question = getQuestionById(questionId);
    if (!question) continue; // unknown id (e.g. demographic keys handled elsewhere) — ignore defensively

    if (Array.isArray(value)) {
      for (const optionValue of value) {
        if (!optionValue) continue;
        rows.push({
          key: `${questionId}::${optionValue}`,
          question_id: questionId,
          option_id: optionValue,
          answer_text: optionValue === "other" ? (otherTextByQuestion[questionId] ?? null) : null,
        });
      }
      continue;
    }

    if (typeof value !== "string" || value === "") continue;

    if (question.type === "single") {
      rows.push({
        key: questionId,
        question_id: questionId,
        option_id: value,
        answer_text: value === "other" ? (otherTextByQuestion[questionId] ?? null) : null,
      });
    } else {
      // text / textarea — free-form, no option
      rows.push({ key: questionId, question_id: questionId, option_id: null, answer_text: value });
    }
  }

  return rows;
}

/** Splits a tracking key back into its question_id + option_id (null for single/text keys). */
export function parseAnswerKey(key: string): { question_id: string; option_id: string | null } {
  const idx = key.indexOf("::");
  if (idx === -1) return { question_id: key, option_id: null };
  return { question_id: key.slice(0, idx), option_id: key.slice(idx + 2) };
}
