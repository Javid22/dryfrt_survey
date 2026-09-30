"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STEP_GROUPS, getQuestionById } from "@/config/surveyQuestions";
import { questionSchemas } from "@/lib/validation/survey";
import type { SurveyAnswers, SurveyQuestion as SurveyQuestionConfig } from "@/types/survey";
import { SurveyQuestion } from "./SurveyQuestion";
import { ProgressBar } from "./ProgressBar";
import { NavigationButtons } from "./NavigationButtons";
import { Card, CardContent } from "@/components/ui/card";
import { saveSurveyProgress, submitSurvey } from "@/app/survey/actions";
import { AlertCircle } from "lucide-react";

const DRAFT_KEY = "dryfrt_survey_draft_v1";

type Draft = {
  answers: SurveyAnswers;
  otherValues: Record<string, string>;
  startedAt: string;
  currentStepIndex: number;
  /** Id of the in-progress submission row, once the first step has been saved. */
  submissionId?: string;
  /** Answer keys that already have a survey_answers row, so later saves know insert-vs-update per answer. */
  savedAnswerKeys?: string[];
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
  const [submissionId, setSubmissionId] = useState<string | undefined>(undefined);
  const [savedAnswerKeys, setSavedAnswerKeys] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Mirror submissionId / savedAnswerKeys outside React state so a
  // same-tick "Next" click always sees the latest values — the queued
  // background save below updates these refs the instant it resolves,
  // without waiting for a re-render, and each queued save reads them
  // (via the chained promise) only after the previous one has updated them.
  const submissionIdRef = useRef<string | undefined>(undefined);
  const savedAnswerKeysRef = useRef<string[]>([]);
  // Chain of in-flight/queued background progress saves, so saves for step
  // 2, 3, ... always run after step 1's save has created the submission row
  // and populated submissionIdRef — even though the user has already moved
  // on to a later step by the time step 1's save actually completes.
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Hydrate from localStorage on mount (client only). This necessarily calls
  // setState from an effect: localStorage is an external system that isn't
  // available during the server render, so there's no way to compute this
  // via a render-time initializer without risking a hydration mismatch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft: Draft = JSON.parse(raw);
        setAnswers(draft.answers ?? {});
        setOtherValues(draft.otherValues ?? {});
        setStartedAt(draft.startedAt ?? new Date().toISOString());
        setCurrentStepIndex(draft.currentStepIndex ?? 0);
        setSubmissionId(draft.submissionId);
        setSavedAnswerKeys(draft.savedAnswerKeys ?? []);
        submissionIdRef.current = draft.submissionId;
        savedAnswerKeysRef.current = draft.savedAnswerKeys ?? [];
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
    if (!hydrated) return;
    try {
      const draft: Draft = { answers, otherValues, startedAt, currentStepIndex, submissionId, savedAnswerKeys };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // localStorage unavailable (private browsing etc.) — degrade gracefully.
    }
  }, [answers, otherValues, startedAt, currentStepIndex, submissionId, savedAnswerKeys, hydrated]);

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

  /**
   * Splits the merged answers into the core question map + top-level
   * demographic fields the DB layer expects separately.
   *
   * NOTE: `purchase_frequency` is deliberately *not* split out here even
   * though the DB has a denormalized `purchase_frequency` column — that
   * column id collided with this exact question id (added back in the v2
   * trim), which silently dropped every answer to "How often do you buy
   * dry fruits?" before it ever reached the server. It's now a normal core
   * question; `derivePurchaseFrequency` in src/lib/db/submissions.ts
   * mirrors it into the denormalized column the same way `purchase_channel`
   * already works, from `coreAnswers` itself.
   */
  function splitAnswersForSave(mergedAnswers: SurveyAnswers) {
    const { area, age_group, ...coreAnswers } = mergedAnswers as Record<string, string | string[]>;
    return {
      coreAnswers,
      area: typeof area === "string" ? area : undefined,
      ageGroup: typeof age_group === "string" ? age_group : undefined,
    };
  }

  function currentMergedAnswers(): SurveyAnswers {
    const mergedAnswers: SurveyAnswers = { ...answers };
    for (const [qId, text] of Object.entries(otherValues)) {
      if (text.trim()) mergedAnswers[`${qId}__other`] = text.trim();
    }
    return mergedAnswers;
  }

  /**
   * Queues this step's save behind any earlier one instead of awaiting it
   * inline — the "Next" click advances the UI immediately and this runs in
   * the background. Chaining off `saveQueueRef` (rather than firing every
   * save in parallel) still guarantees step 1's save creates the submission
   * row and populates submissionIdRef/savedAnswerKeysRef before step 2's
   * save reads them, no matter how fast the customer clicks through. A
   * failure here is logged but never blocks navigation — the localStorage
   * draft is the safety net, and the final submit re-sends every answer.
   */
  function queueProgressSave(
    coreAnswers: Record<string, string | string[]>,
    stepQuestionIds: string[],
    area: string | undefined,
    ageGroup: string | undefined
  ) {
    const startedAtValue = startedAt || new Date().toISOString();
    const website = honeypot;
    setIsSaving(true);
    const next = saveQueueRef.current
      .then(() =>
        saveSurveyProgress({
          submissionId: submissionIdRef.current,
          answers: coreAnswers,
          // Scopes the DB write to just this screen's question(s) instead of
          // reprocessing every question answered so far — without this, each
          // "Next" click re-sent an UPDATE for every previously-saved answer
          // too, adding a network round trip per prior question and making
          // saves slower the further into the survey the customer got.
          stepQuestionIds,
          previouslySavedAnswerKeys: savedAnswerKeysRef.current,
          startedAt: startedAtValue,
          area,
          ageGroup,
          website,
        })
      )
      .then((result) => {
        if (result.success) {
          submissionIdRef.current = result.id;
          savedAnswerKeysRef.current = result.savedAnswerKeys;
          setSubmissionId(result.id);
          setSavedAnswerKeys(result.savedAnswerKeys);
        } else {
          console.error("Failed to save survey progress:", result.error);
        }
      })
      .catch((err) => {
        console.error("Failed to save survey progress:", err);
      })
      .finally(() => {
        // Only clear the indicator once nothing else is queued behind us.
        if (saveQueueRef.current === next) setIsSaving(false);
      });
    saveQueueRef.current = next;
    return next;
  }

  async function handleNext() {
    if (!validateCurrentGroup()) return;

    if (!isLastStep) {
      // Kick off this step's save in the background and move to the next
      // question immediately — no waiting on the network round trip.
      const { coreAnswers, area, ageGroup } = splitAnswersForSave(currentMergedAnswers());
      queueProgressSave(coreAnswers, currentGroup.map((q) => q.id), area, ageGroup);
      setCurrentStepIndex(safeStepIndex + 1);
      return;
    }

    // Final step -> submit. Wait for any still-in-flight background saves
    // first, so submissionIdRef/savedAnswerKeysRef are current before we
    // send the full, final payload.
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveQueueRef.current;
    } catch {
      // Already logged inside queueProgressSave; submit proceeds regardless.
    }

    const { coreAnswers, area, ageGroup } = splitAnswersForSave(currentMergedAnswers());

    try {
      const result = await submitSurvey({
        submissionId: submissionIdRef.current,
        answers: coreAnswers,
        previouslySavedAnswerKeys: savedAnswerKeysRef.current,
        startedAt: startedAt || new Date().toISOString(),
        area,
        ageGroup,
        website: honeypot,
      });

      if (result.success) {
        try {
          // Clear the draft so a later visit starts a fresh submission —
          // customers are allowed to fill out the survey again any time.
          localStorage.removeItem(DRAFT_KEY);
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
            isSaving={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
