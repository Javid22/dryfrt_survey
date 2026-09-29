import { describe, expect, it } from "vitest";
import { buildSurveyCsv, submissionToCsvRow, CSV_COLUMNS } from "@/lib/analytics/csv";
import type { SubmissionDetail } from "@/types/survey";

function makeDetail(overrides: Partial<SubmissionDetail["submission"]> = {}): SubmissionDetail {
  return {
    submission: {
      id: "11111111-1111-1111-1111-111111111111",
      survey_version: "v1",
      source: "web",
      started_at: "2026-01-01T00:00:00.000Z",
      completed_at: "2026-01-01T00:03:00.000Z",
      area: "Avadi",
      age_group: "25_34",
      purchase_frequency: "once_a_month",
      purchase_channel: "local_shop",
      store_name: "NJ Happie Foods",
      store_area: "Avadi",
      online_platform: null,
      created_at: "2026-01-01T00:03:00.000Z",
      ...overrides,
    },
    answers: {
      q3_purchase_reasons: {
        id: "a1",
        submission_id: "11111111-1111-1111-1111-111111111111",
        question_id: "q3_purchase_reasons",
        answer_text: null,
        answer_json: ["price", "freshness"],
        created_at: "2026-01-01T00:03:00.000Z",
      },
      q4_likes_most: {
        id: "a2",
        submission_id: "11111111-1111-1111-1111-111111111111",
        question_id: "q4_likes_most",
        answer_text: "Great, fresh products",
        answer_json: null,
        created_at: "2026-01-01T00:03:00.000Z",
      },
    },
  };
}

describe("submissionToCsvRow", () => {
  it("shapes a submission into a row matching CSV_COLUMNS order", () => {
    const row = submissionToCsvRow(makeDetail());
    expect(row).toHaveLength(CSV_COLUMNS.length);
    expect(row[0]).toBe("11111111-1111-1111-1111-111111111111");
    expect(row[2]).toBe("Avadi");
    expect(row[3]).toBe("local_shop");
    expect(row[4]).toBe("NJ Happie Foods");
    expect(row[7]).toBe("price; freshness");
    expect(row[8]).toBe("Great, fresh products");
  });

  it("fills missing answers with empty strings rather than throwing", () => {
    const detail = makeDetail();
    detail.answers = {};
    const row = submissionToCsvRow(detail);
    expect(row[8]).toBe("");
    expect(row[7]).toBe("");
  });
});

describe("buildSurveyCsv", () => {
  it("builds a header row plus one row per submission", () => {
    const csv = buildSurveyCsv([makeDetail(), makeDetail({ id: "22222222-2222-2222-2222-222222222222" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
  });

  it("escapes commas and quotes in fields", () => {
    const detail = makeDetail();
    detail.answers.q4_likes_most = {
      ...detail.answers.q4_likes_most,
      answer_text: 'Good, but "pricey"',
    };
    const csv = buildSurveyCsv([detail]);
    expect(csv).toContain('"Good, but ""pricey"""');
  });
});
