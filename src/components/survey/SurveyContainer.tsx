"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_GROUPS, getQuestionById } from "@/config/surveyQuestions";
import { questionSchemas } from "@/lib/validation/survey";
import type { SurveyAnswers, SurveyQuestion as SurveyQuestionConfig } from "@/types/survey";
import { SurveyQuestion } from "./SurveyQuestion";
import { ProgressBar } from "./ProgressBar";
import { NavigationButtons } from "./NavigationButtons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { submitSurvey } from "@/app/survey/actions";
import { AlertCircle } from "lucide-react";

const DRAFT_KEY = "dryfrt_survey_draft_v1";
const LAST_SUBMISSION_KEY = "dryfrt_last_submission_at";
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

type Draft = {
  answers: SurveyAnswers;
  otherValues: Record<string, string>;
  startedAt: string;
  currentStepIndex: number;
};

function isQuestionVisible(q: SurveyQuestionConfig, answers: SurveyAnswers): boolean {
  if (!q.conditional) return true;
  const parent = answers[q.conditional.questionId];
  return typeof parent === "string" && q.conditional.values.includes(parent);
}

export function SurveyContainer() {
  const router = useRouter();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string>("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Hydrate from localStorage / cooldown check on mount (client only). This
  // necessarily calls setState from an effect: localStorage is an external
  // system that isn't available during the server render, so there's no way
  // to compute this via a render-time initializer without risking a
  // hydration mismatch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const lastSubmission = localStorage.getItem(LAST_SUBMISSION_KEY);
      if (lastSubmission) {
        const elapsed = Date.now() - Number(lastSubmission);
        if (elapsed < COOLDOWN_MS) {
          setCooldownActive(true);
          setHydrated(true);
          return;
        }
      }

      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: Draft = JSON.parse(raw);
        setAnswers(draft.answers ?? {});
        setOtherValues(draft.otherValues ?? {});
        setStartedAt(draft.startedAt ?? new Date().toISOString());
        setCurrentStepIndex(draft.currentStepIndex ?? 0);
      } else {
        setStartedAt(new Date().toISOString());
      }
    } catch {
      setStartedAt(new Date().toISOString());
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist draft on every change so an accidental refresh doesn't lose answers.
  useEffect(() => {
    if (!hydrated || cooldownActive) return;
    try {
      const draft: Draft = { answers, otherValues, startedAt, currentStepIndex };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // localStorage unavailable (private browsing etc.) — degrade gracefully.
    }
  }, [answers, otherValues, startedAt, currentStepIndex, hydrated, cooldownActive]);

  const visibleSteps = useMemo(() => {
    return STEP_GROUPS.map((groupIds) =>
      groupIds
        .map((id) => getQuestionById(id))
        .filter((q): q is SurveyQuestionConfig => Boolean(q) && isQuestionVisible(q!, answers))
    ).filter((group) => group.length > 0);
  }, [answers]);

  const totalSteps = visibleSteps.length;
  const safeStepIndex = Math.min(currentStepIndex, Math.max(totalSteps - 1, 0));
  const currentGroup = visibleSteps[safeStepIndex] ?? [];
  const isFirstStep = safeStepIndex === 0;
  const isLastStep = safeStepIndex === totalSteps - 1;

  function updateAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  }

  function updateOther(questionId: string, value: string) {
    setOtherValues((prev) => ({ ...prev, [questionId]: value }));
  }

  function validateCurrentGroup(): boolean {
    const nextErrors: Record<string, string> = {};
    for (const q of currentGroup) {
      const schema = questionSchemas[q.id];
      const result = schema.safeParse(answers[q.id]);
      if (!result.success) {
        nextErrors[q.id] = result.error.issues[0]?.message ?? "Please check this answer.";
      }
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  async function handleNext() {
    if (!validateCurrentGroup()) return;

    if (!isLastStep) {
      setCurrentStepIndex(safeStepIndex + 1);
      return;
    }

    // Final step -> submit.
    setIsSubmitting(true);
    setSubmitError(null);

    const mergedAnswers: SurveyAnswers = { ...answers };
    for (const [qId, text] of Object.entries(otherValues)) {
      if (text.trim()) mergedAnswers[`${qId}__other`] = text.trim();
    }

    const { area, age_group, purchase_frequency, ...coreAnswers } = mergedAnswers as Record<
      string,
      string | string[]
    >;

    try {
      const result = await submitSurvey({
        answers: coreAnswers,
        startedAt: startedAt || new Date().toISOString(),
        area: typeof area === "string" ? area : undefined,
        ageGroup: typeof age_group === "string" ? age_group : undefined,
        purchaseFrequency: typeof purchase_frequency === "string" ? purchase_frequency : undefined,
        website: honeypot,
      });

      if (result.success) {
        try {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.setItem(LAST_SUBMISSION_KEY, String(Date.now()));
        } catch {
          // ignore storage errors
        }
        router.push("/survey/success");
      } else {
        if (result.fieldErrors) setErrors((prev) => ({ ...prev, ...result.fieldErrors }));
        setSubmitError(result.error);
      }
    } catch {
      setSubmitError(
        "Something went wrong while submitting your response. Please check your internet connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    if (!isFirstStep) setCurrentStepIndex(safeStepIndex - 1);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-400">
        Loading survey...
      </div>
    );
  }

  if (cooldownActive) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-amber-600" />
          <h2 className="text-xl font-semibold text-stone-900">
            You&apos;ve already shared your feedback
          </h2>
          <p className="text-stone-500">
            Thanks again for completing this survey recently. If you&apos;d like to submit again later,
            please come back after a short while.
          </p>
          <Button onClick={() => router.push("/")}>Back to home</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <ProgressBar currentStep={safeStepIndex + 1} totalSteps={totalSteps} />

      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* Honeypot field — hidden from real users, bots often fill it in. */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-10">
            {currentGroup.map((q) => (
              <SurveyQuestion
                key={q.id}
                question={q}
                value={answers[q.id]}
                otherValue={otherValues[q.id] ?? ""}
                onChange={(v) => updateAnswer(q.id, v)}
                onOtherChange={(v) => updateOther(q.id, v)}
                error={errors[q.id]}
              />
            ))}
          </div>

          {submitError && (
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <NavigationButtons
            onBack={handleBack}
            onNext={handleNext}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
