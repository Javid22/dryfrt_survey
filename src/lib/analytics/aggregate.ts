import type { SurveyAnswerDbRow, SurveySubmission } from "@/types/survey";
import { getQuestionById } from "@/config/surveyQuestions";
import { normalizeStoreName } from "./normalizeStoreName";

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

export function topPurchaseReasons(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "q3_purchase_reasons", submissionIds);
}

export function topProblems(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "q5_dislikes", submissionIds);
}

export function desiredFeatures(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "q7_ideal_features", submissionIds);
}

export function giftingDemand(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "q8_interested_services", submissionIds);
}

export function customisationDemand(
  answers: SurveyAnswerDbRow[],
  submissionIds: Set<string> | null = null
): CountItem[] {
  return countOccurrences(answers, "q10_customisation_preferences", submissionIds);
}

export type DashboardStats = {
  totalResponses: number;
  offlineBuyerPct: number;
  onlineBuyerPct: number;
  giftBuyerPct: number;
};

const OFFLINE_CHANNELS = new Set(["local_shop", "supermarket", "wholesale_market", "whatsapp_instagram"]);

/** Top dashboard cards (spec section 14) — computed dynamically, never hardcoded. */
export function computeDashboardStats(
  submissions: SurveySubmission[],
  answers: SurveyAnswerDbRow[]
): DashboardStats {
  const total = submissions.length;
  if (total === 0) {
    return { totalResponses: 0, offlineBuyerPct: 0, onlineBuyerPct: 0, giftBuyerPct: 0 };
  }

  const offlineCount = submissions.filter(
    (s) => s.purchase_channel && OFFLINE_CHANNELS.has(s.purchase_channel)
  ).length;
  const onlineCount = submissions.filter((s) => s.purchase_channel === "online").length;

  const submissionIds = new Set(submissions.map((s) => s.id));
  const giftAnswers = answersForQuestion(answers, "q9_gift_purchase_history", submissionIds);
  const giftBuyerCount = giftAnswers.filter(
    (values) => values.length > 0 && !(values.length === 1 && values[0] === "no")
  ).length;

  return {
    totalResponses: total,
    offlineBuyerPct: Math.round((offlineCount / total) * 100),
    onlineBuyerPct: Math.round((onlineCount / total) * 100),
    giftBuyerPct: Math.round((giftBuyerCount / total) * 100),
  };
}

export type CompetitorRankItem = { name: string; count: number };

/** "Where customers currently buy" ranked list, from Q2 store/online names. */
export function competitorRanking(submissions: SurveySubmission[]): CompetitorRankItem[] {
  const counts = new Map<string, number>();
  for (const s of submissions) {
    const raw = s.store_name || s.online_platform;
    if (!raw) continue;
    const normalized = normalizeStoreName(raw);
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Filters submissions down to a single area ("All Areas" = no filter). */
export function filterByArea(submissions: SurveySubmission[], area: string): SurveySubmission[] {
  if (!area || area === "All Areas") return submissions;
  return submissions.filter((s) => (s.area ?? "").toLowerCase() === area.toLowerCase());
}
