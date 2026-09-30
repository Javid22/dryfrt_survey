/**
 * Core survey types shared across the app (config, validation, UI, DB layer).
 */

export type SurveyQuestionType = "single" | "multiple" | "text" | "textarea";

export type SurveyOption = {
  value: string;
  label: string;
};

export type SurveyQuestion = {
  id: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  options?: SurveyOption[];
  required?: boolean;
  maxSelections?: number;
  /** Max characters for text/textarea questions. */
  maxLength?: number;
  placeholder?: string;
  /** Only render this question if questionId's answer is one of `values`. */
  conditional?: { questionId: string; values: string[] };
  /**
   * If set, selecting this option value clears every other selection for the
   * question (and selecting any other option clears this one). Used for Q9's
   * "No" option. Generalized on the config type rather than special-cased so
   * future questions can reuse the behavior.
   */
  exclusiveOptionValue?: string;
  /** When true, selecting "Other" reveals a free-text follow-up field. */
  allowOther?: boolean;
  /** Which section this question belongs to, for grouping/analytics. */
  section?: "core" | "demographic";
  /**
   * For text/textarea questions: tap-to-fill phrases shown above the input
   * so an open question doesn't start from a blank page. Tapping one drops
   * that phrase into the field (still editable); it doesn't restrict what
   * the customer can actually type.
   */
  suggestions?: string[];
};

/** Answer value for a single question, keyed by question id. */
export type SurveyAnswerValue = string | string[] | undefined;

export type SurveyAnswers = Record<string, SurveyAnswerValue>;

/** Shape persisted to localStorage while the user fills the survey. */
export type SurveyDraft = {
  answers: SurveyAnswers;
  startedAt: string;
  currentStepIndex: number;
};

/** One row as ultimately written to survey_answers. */
export type SurveyAnswerRow = {
  question_id: string;
  answer_text: string | null;
  answer_json: string[] | null;
};

/** Payload sent from the client to the submit server action / route. */
export type SurveySubmissionPayload = {
  /** Id of the in-progress submission being finalized, if one was created by an earlier "save progress" call. */
  submissionId?: string;
  answers: SurveyAnswers;
  startedAt: string;
  area?: string;
  ageGroup?: string;
  purchaseFrequency?: string;
  /** Honeypot field — must stay empty. */
  website?: string;
  /**
   * Keys the client already knows have a survey_answers row, from an
   * earlier "save progress" call — bare question_id for single/text
   * answers, "questionId::optionValue" for one selected option of a
   * multi-select question. See src/lib/survey/answerRows.ts.
   */
  previouslySavedAnswerKeys?: string[];
  /**
   * question_ids to actually write this call (progress saves only — omit
   * for a final submit, which processes everything). Scopes the write to
   * just the current screen instead of reprocessing every question
   * answered so far, which is what made intermediate saves get slower the
   * further into the survey the customer got.
   */
  stepQuestionIds?: string[];
};

/**
 * Payload sent on every "Next" click (not just the final submit) so answers
 * are saved one question group at a time as the customer progresses.
 */
export type SurveyProgressPayload = SurveySubmissionPayload;

/** A row from survey_submissions joined with denormalized fields. */
export type SurveySubmission = {
  id: string;
  survey_version: string;
  source: string | null;
  started_at: string | null;
  completed_at: string | null;
  area: string | null;
  age_group: string | null;
  purchase_frequency: string | null;
  purchase_channel: string | null;
  store_name: string | null;
  store_area: string | null;
  online_platform: string | null;
  created_at: string;
};

export type SurveyAnswerDbRow = {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: string[] | null;
  created_at: string;
};

/** Full submission detail: submission row + all its answers keyed by question id. */
export type SubmissionDetail = {
  submission: SurveySubmission;
  answers: Record<string, SurveyAnswerDbRow>;
};
