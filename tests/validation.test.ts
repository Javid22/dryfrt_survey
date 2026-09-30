import { describe, expect, it } from "vitest";
import { validateSurveyPayload } from "@/lib/validation/survey";

function baseAnswers() {
  return {
    q1_purchase_channel: "local_shop",
    top_priorities: ["price", "quality"],
    monthly_budget: "1000_2000",
    purchase_frequency: "once_a_month",
    improvement_feedback: "Lower prices please",
  };
}

describe("validateSurveyPayload", () => {
  it("accepts a fully valid submission", () => {
    const result = validateSurveyPayload({
      answers: baseAnswers(),
      startedAt: new Date().toISOString(),
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

  it("rejects top priorities with more than 3 selections", () => {
    const answers = baseAnswers();
    answers.top_priorities = ["price", "quality", "trust", "service"];
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((i) => i.questionId === "top_priorities")).toBe(true);
    }
  });

  it("rejects a textarea answer that is too long", () => {
    const answers = baseAnswers();
    answers.improvement_feedback = "a".repeat(1001);
    const result = validateSurveyPayload({ answers, startedAt: new Date().toISOString() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.some((i) => i.questionId === "improvement_feedback")).toBe(true);
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

  it("rejects a malformed top-level payload", () => {
    const result = validateSurveyPayload({ answers: "not-an-object" });
    expect(result.success).toBe(false);
  });
});
