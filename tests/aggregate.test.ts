import { describe, expect, it } from "vitest";
import {
  computeDashboardStats,
  filterByArea,
  purchaseChannelBreakdown,
  topPriorities,
} from "@/lib/analytics/aggregate";
import type { SurveyAnswerDbRow, SurveySubmission } from "@/types/survey";

function submission(overrides: Partial<SurveySubmission>): SurveySubmission {
  return {
    id: crypto.randomUUID(),
    survey_version: "v2",
    source: "web",
    started_at: null,
    completed_at: null,
    area: null,
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
      completedResponses: 0,
      offlineBuyerPct: 0,
      onlineBuyerPct: 0,
    });
  });

  it("computes percentages dynamically from submissions", () => {
    const submissions = [
      submission({ purchase_channel: "local_shop" }),
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "online" }),
      submission({ purchase_channel: "wholesale_market" }),
    ];

    const stats = computeDashboardStats(submissions, []);
    expect(stats.totalResponses).toBe(4);
    expect(stats.onlineBuyerPct).toBe(50);
    expect(stats.offlineBuyerPct).toBe(50);
  });

  it("counts totalResponses including in-progress drafts, separately from completedResponses", () => {
    const submissions = [
      submission({ completed_at: new Date().toISOString() }),
      submission({ completed_at: new Date().toISOString() }),
      submission({ completed_at: null }),
    ];

    const stats = computeDashboardStats(submissions, []);
    expect(stats.totalResponses).toBe(3);
    expect(stats.completedResponses).toBe(2);
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

describe("topPriorities", () => {
  it("aggregates multi-select answers with human-readable labels", () => {
    const submissions = [submission({}), submission({})];
    const answers: SurveyAnswerDbRow[] = [
      {
        id: "a1",
        submission_id: submissions[0].id,
        question_id: "top_priorities",
        answer_text: null,
        answer_json: ["price", "quality"],
        created_at: new Date().toISOString(),
      },
      {
        id: "a2",
        submission_id: submissions[1].id,
        question_id: "top_priorities",
        answer_text: null,
        answer_json: ["price"],
        created_at: new Date().toISOString(),
      },
    ];
    const result = topPriorities(answers);
    expect(result[0].value).toBe("price");
    expect(result[0].count).toBe(2);
    expect(result[0].label).toBe("Low price");
  });
});
