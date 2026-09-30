import type { SurveyAnswerDbRow, SurveySubmission } from "@/types/survey";
import { getQuestionById } from "@/config/surveyQuestions";

export type CountItem = { label: string; value: string; count: number };

function optionLabel(questionId: string, value: string): string {
  const q = getQuestionById(questionId);
  const opt = q?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

/** Answers for one question across a set of submissions, as multi-value arrays. */
function answersForQuestion(
  answers: SurveyAnswerDbRow[],
  questionId: string,
  submissionIds: Set<string> | null
): string[][] {
  return answers
    .filter((a) => a.question_id === questionId)
    .filter((a) => !submissionIds || submissionIds.has(a.submission_id))
    .map((a) => {
      if (a.answer_json && a.answer_json.length > 0) return a.answer_json;
      if (a.answer_text) return [a.answer_text];
      return [];
    });
}

function countOccurrences(
  answers: SurveyAnswerDbRow[],
  questionId: string,
  submissionIds: Set<string> | null
): CountItem[] {
  const groups = answersForQuestion(answers, questionId, submissionIds);
  const counts = new Map<string, number>();
  for (const values of groups) {
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count, label: optionLabel(questionId, value) }))
    .sort((a, b) => b.count - a.count);
}

/** Q1 purchase channel breakdown, using the denormalized column for speed. */
export function purchaseChannelBreakdown(submissions: SurveySubmission[]): CountItem[] {
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const channel = s.purchase_channel ?? "unknown";
    counts.set(channel, (counts.get(channel) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count, label: optionLabel("q1_purchase_channel", value) }))
    .sort((a, b) => b.count - a.count);
}

/** "What matters most" breakdown (up to 3 picks per respondent). */
export function topPriorities(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "top_priorities", submissionIds);
}

export function monthlyBudgetBreakdown(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "monthly_budget", submissionIds);
}

export function purchaseFrequencyBreakdown(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "purchase_frequency", submissionIds);
}

export type DashboardStats = {
  /** Every row in survey_submissions, completed or still in progress. */
  totalResponses: number;
  /** The subset of totalResponses that reached the final "Submit". */
  completedResponses: number;
  offlineBuyerPct: number;
  onlineBuyerPct: number;
};

const OFFLINE_CHANNELS = new Set(["local_shop", "supermarket", "wholesale_market"]);

/**
 * Top dashboard cards — computed dynamically, never hardcoded. Takes the
 * unfiltered submission list (drafts included) so "Total Responses" reflects
 * everything sitting in the table; channel percentages are still over
 * whoever has answered Q1 so far, complete or not.
 */
export function computeDashboardStats(
  submissions: SurveySubmission[],
  answers: SurveyAnswerDbRow[]
): DashboardStats {
  void answers; // no longer needed for these stats, kept in the signature so callers don't need to change
  const total = submissions.length;
  const completed = filterCompleted(submissions).length;
  if (total === 0) {
    return { totalResponses: 0, completedResponses: 0, offlineBuyerPct: 0, onlineBuyerPct: 0 };
  }

  const withChannel = submissions.filter((s) => s.purchase_channel).length;
  const offlineCount = submissions.filter(
    (s) => s.purchase_channel && OFFLINE_CHANNELS.has(s.purchase_channel)
  ).length;
  const onlineCount = submissions.filter((s) => s.purchase_channel === "online").length;

  return {
    totalResponses: total,
    completedResponses: completed,
    offlineBuyerPct: withChannel === 0 ? 0 : Math.round((offlineCount / withChannel) * 100),
    onlineBuyerPct: withChannel === 0 ? 0 : Math.round((onlineCount / withChannel) * 100),
  };
}

/** Filters submissions down to a single area ("All Areas" = no filter). */
export function filterByArea(submissions: SurveySubmission[], area: string): SurveySubmission[] {
  if (!area || area === "All Areas") return submissions;
  return submissions.filter((s) => (s.area ?? "").toLowerCase() === area.toLowerCase());
}

/**
 * Keeps only submissions that reached the final "Submit" — for charts that
 * would otherwise be skewed by abandoned in-progress drafts. getAllSubmissions
 * / getAllAnswers return everything (drafts included) so pages that want to
 * show every row (Dashboard, Responses) can; call this first wherever a
 * chart should represent finished surveys only.
 */
export function filterCompleted(submissions: SurveySubmission[]): SurveySubmission[] {
  return submissions.filter((s) => s.completed_at !== null);
}
