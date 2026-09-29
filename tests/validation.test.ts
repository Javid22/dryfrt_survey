import { describe, expect, it } from "vitest";
import { validateSurveyPayload } from "@/lib/validation/survey";

function baseAnswers() {
  return {
    q1_purchase_channel: "local_shop",
    q2_store_name: "NJ Happie Foods",
    q2_store_area: "Avadi",
    q3_purchase_reasons: ["price", "freshness"],
    q4_likes_most: "Great quality",
    q5_dislikes: ["price_high"],
    q6_change_one_thing: "Lower prices",
    q7_ideal_features: ["better_prices", "freshness_guarantee"],
    q8_interested_services: ["regular_shopping"],
    q9_gift_purchase_history: ["wedding_engagement"],
    q10_customisation_preferences: ["quantity"],
    q11_switch_reasons: ["better_price"],
    q12_owner_suggestion: "I would offer better packaging.",
  };
}

describe("validateSurveyPayload", () => {
  it("accepts a fully valid submission", () => {
    const result = validateSurveyPayload({
      answers: baseAnswers(),
      startedAt: new Date().toISOString(),
      area: "Avadi",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a submission missing a required question", () => {
    const answers = baseAnswers();
    // @ts-expect-error intentionally deleting a required field for the test
    delete answers.q1_purchase_channel;
    const result = validateSurveyPayload({
      answers,
      startedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((i) => i.questionId === "q1_purchase_channel")).toBe(true);
    }
  });

  it("rejects Q3 with more than 3 selections", () => {
    const answers = baseAnswers();
    answers.q3_purchase_reasons = ["price", "freshness", "trust", "variety"];
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((i) => i.questionId === "q3_purchase_reasons")).toBe(true);
    }
  });

  it("rejects Q7 with more than 5 selections", () => {
    const answers = baseAnswers();
    answers.q7_ideal_features = [
      "better_prices",
      "freshness_guarantee",
      "more_varieties",
      "transparent_pricing",
      "premium_packaging",
      "home_delivery",
    ];
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(false);
  });

  it("rejects a textarea answer that is too long", () => {
    const answers = baseAnswers();
    answers.q12_owner_suggestion = "a".repeat(1001);
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((i) => i.questionId === "q12_owner_suggestion")).toBe(true);
    }
  });

  it("rejects a tripped honeypot field as spam", () => {
    const result = validateSurveyPayload({
      answers: baseAnswers(),
      startedAt: new Date().toISOString(),
      website: "http://spam.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("does not require conditional Q2 fields when Q1 is 'online'", () => {
    const answers = baseAnswers();
    // @ts-expect-error removing offline-only fields for this test case
    delete answers.q2_store_name;
    // @ts-expect-error removing offline-only fields for this test case
    delete answers.q2_store_area;
    answers.q1_purchase_channel = "online";
    (answers as Record<string, unknown>).q2_online_platform = "Amazon";
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed top-level payload", () => {
    const result = validateSurveyPayload({ answers: "not-an-object" });
    expect(result.success).toBe(false);
  });
});
