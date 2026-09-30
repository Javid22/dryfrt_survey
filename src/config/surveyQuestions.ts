import type { SurveyQuestion } from "@/types/survey";

/**
 * Single source of truth for the v2 survey. SurveyQuestion.tsx renders any
 * question generically based on `type`; SurveyContainer.tsx handles
 * conditional visibility and the "exclusive option" behavior.
 *
 * Trimmed down to 5 questions (from an earlier ~15-20 question version) to
 * keep completion high: one channel question, one merged "what matters
 * most" question, budget, frequency, and a single open-feedback question
 * with tap-to-fill suggestions instead of three separate open-text
 * questions. Wording is kept to simple, everyday words throughout.
 */
export const SURVEY_VERSION = "v2";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q1_purchase_channel",
    title: "Where do you usually buy dry fruits?",
    type: "single",
    required: true,
    section: "core",
    allowOther: true,
    options: [
      { value: "local_shop", label: "Local dry-fruit shop" },
      { value: "supermarket", label: "Supermarket" },
      { value: "online", label: "Online (website or app)" },
      { value: "wholesale_market", label: "Wholesale market" },
      { value: "dont_buy", label: "I don't buy dry fruits" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "top_priorities",
    title: "What matters most to you when choosing where to buy?",
    description: "Choose up to 3.",
    type: "multiple",
    maxSelections: 3,
    section: "core",
    allowOther: true,
    options: [
      { value: "price", label: "Low price" },
      { value: "quality", label: "Good quality" },
      { value: "trust", label: "I trust the shop" },
      { value: "convenience", label: "Easy to reach" },
      { value: "service", label: "Good service" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "monthly_budget",
    title: "What's your monthly budget for dry fruits?",
    type: "single",
    section: "core",
    options: [
      { value: "under_500", label: "Under ₹500" },
      { value: "500_1000", label: "₹500 – ₹1,000" },
      { value: "1000_2000", label: "₹1,000 – ₹2,000" },
      { value: "above_2000", label: "Above ₹2,000" },
      { value: "only_during_festivals_occasions", label: "Only on festivals" },
    ],
  },
  {
    id: "purchase_frequency",
    title: "How often do you buy dry fruits?",
    type: "single",
    section: "core",
    options: [
      { value: "every_week", label: "Every week" },
      { value: "2_3_times_a_month", label: "2–3 times a month" },
      { value: "once_a_month", label: "Once a month" },
      { value: "every_few_months", label: "Once in a few months" },
      { value: "mainly_festivals_functions", label: "Only on festivals" },
      { value: "rarely", label: "Rarely" },
    ],
  },
  {
    id: "improvement_feedback",
    title: "Is there anything you'd like to change about how you buy dry fruits?",
    type: "textarea",
    placeholder: "Tell us here...",
    maxLength: 1000,
    section: "core",
    /**
     * Tap-to-fill suggestions shown above the text box, so answering this
     * open question doesn't mean starting from a blank page. Tapping one
     * drops that phrase into the field (SurveyQuestion.tsx); the customer
     * can still edit it or type something else entirely.
     */
    suggestions: ["Lower prices", "Better quality", "Faster delivery", "More variety", "Nothing, all good"],
  },
];

/** Every question is its own screen — there's no grouping/conditional logic left after the v2 trim. */
export const STEP_GROUPS: string[][] = [
  ["q1_purchase_channel"],
  ["top_priorities"],
  ["monthly_budget"],
  ["purchase_frequency"],
  ["improvement_feedback"],
];

export function getQuestionById(id: string): SurveyQuestion | undefined {
  return SURVEY_QUESTIONS.find((q) => q.id === id);
}

export const CORE_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.section === "core");
export const DEMOGRAPHIC_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.section === "demographic");

export const AREA_OPTIONS = [
  "All Areas",
  "Pattabiram",
  "Avadi",
  "Nemilicheri",
  "Veppampattu",
  "Thiruninravur",
  "Tiruvallur",
  "Chennai",
  "Other",
];
