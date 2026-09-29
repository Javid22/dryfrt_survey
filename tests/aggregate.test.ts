import { describe, expect, it } from "vitest";
import {
  computeDashboardStats,
  filterByArea,
  purchaseChannelBreakdown,
  topProblems,
} from "@/lib/analytics/aggregate";
import type { SurveyAnswerDbRow, SurveySubmission } from "@/types/survey";

function submission(overrides: Partial<SurveySubmission>): SurveySubmission {
  return {
    id: crypto.randomUUID(),
    survey_version: "v1",
    source: "web",
    started_at: null,
    completed_at: null,
    area: "Avadi",
    age_group: null,
    purchase_frequency: null,
    purchase_channel: "local_shop",
    store_name: null,
    store_area: null,
    online_platform: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeDashboardStats", () => {
  it("returns zeros for an empty dataset", () => {
    const stats = computeDashboardStats([], []);
    expect(stats).toEqual({
      totalResponses: 0,
      offlineBuyerPct: 0,
      onlineBuyerPct: 0,
      giftBuyerPct: 0,
    });
  });

  it("computes percentages dynamically from submissions", () => {
    const submissions = [
      submission({ purchase_channel: "local_shop" }),
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "wholesale_market" }),
    ];
    const answers: SurveyAnswerDbRow[] = submissions.map((s, idx) => ({
      id: `a${idx}`,
      submission_id: s.id,
      question_id: "q9_gift_purchase_history",
      answer_text: null,
      answer_json: idx === 0 ? ["wedding_engagement"] : ["no"],
      created_at: new Date().toISOString(),
    }));

    const stats = computeDashboardStats(submissions, answers);
    expect(stats.totalResponses).toBe(4);
    expect(stats.onlineBuyerPct).toBe(50);
    expect(stats.offlineBuyerPct).toBe(50);
    expect(stats.giftBuyerPct).toBe(25);
  });
});

describe("purchaseChannelBreakdown", () => {
  it("counts and sorts channels descending", () => {
    const submissions = [
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "local_shop" }),
    ];
    const breakdown = purchaseChannelBreakdown(submissions);
    expect(breakdown[0].value).toBe("online");
    expect(breakdown[0].count).toBe(2);
  });
});

describe("filterByArea", () => {
  const submissions = [submission({ area: "Avadi" }), submission({ area: "Chennai" })];

  it("returns everything for 'All Areas'", () => {
    expect(filterByArea(submissions, "All Areas")).toHaveLength(2);
  });

  it("filters case-insensitively by area", () => {
    expect(filterByArea(submissions, "avadi")).toHaveLength(1);
  });
});

describe("topProblems", () => {
  it("aggregates multi-select answers with human-readable labels", () => {
    const submissions = [submission({}), submission({})];
    const answers: SurveyAnswerDbRow[] = [
      {
        id: "a1",
        submission_id: submissions[0].id,
        question_id: "q5_dislikes",
        answer_text: null,
        answer_json: ["price_high", "not_fresh"],
        created_at: new Date().toISOString(),
      },
      {
        id: "a2",
        submission_id: submissions[1].id,
        question_id: "q5_dislikes",
        answer_text: null,
        answer_json: ["price_high"],
        created_at: new Date().toISOString(),
      },
    ];
    const result = topProblems(answers);
    expect(result[0].value).toBe("price_high");
    expect(result[0].count).toBe(2);
    expect(result[0].label).toBe("Price is high");
  });
});
