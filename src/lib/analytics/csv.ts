import type { SubmissionDetail } from "@/types/survey";

export const CSV_COLUMNS = [
  "Submission ID",
  "Date",
  "Area",
  "Purchase channel",
  "Store",
  "Store area",
  "Online platform",
  "Purchase reasons",
  "Likes",
  "Problems",
  "Improvement",
  "Interested services",
  "Gifting experience",
  "Customisation",
  "Switching reasons",
  "Final suggestion",
] as const;

function joinMulti(value: string[] | null | undefined): string {
  return (value ?? []).join("; ");
}

function textOf(detail: SubmissionDetail, questionId: string): string {
  return detail.answers[questionId]?.answer_text ?? "";
}

function jsonOf(detail: SubmissionDetail, questionId: string): string[] {
  return detail.answers[questionId]?.answer_json ?? [];
}

/** Shapes one submission detail into a flat row matching CSV_COLUMNS order. */
export function submissionToCsvRow(detail: SubmissionDetail): string[] {
  const { submission } = detail;
  return [
    submission.id,
    submission.created_at,
    submission.area ?? "",
    submission.purchase_channel ?? "",
    submission.store_name ?? "",
    submission.store_area ?? "",
    submission.online_platform ?? "",
    joinMulti(jsonOf(detail, "q3_purchase_reasons")),
    textOf(detail, "q4_likes_most"),
    joinMulti(jsonOf(detail, "q5_dislikes")),
    textOf(detail, "q6_change_one_thing"),
    joinMulti(jsonOf(detail, "q8_interested_services")),
    joinMulti(jsonOf(detail, "q9_gift_purchase_history")),
    joinMulti(jsonOf(detail, "q10_customisation_preferences")),
    joinMulti(jsonOf(detail, "q11_switch_reasons")),
    textOf(detail, "q12_owner_suggestion"),
  ];
}

/** Escapes a single CSV field per RFC 4180. */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Builds a full CSV string (header + rows) from submission details. */
export function buildSurveyCsv(details: SubmissionDetail[]): string {
  const header = CSV_COLUMNS.map(escapeCsvField).join(",");
  const rows = details.map((d) => submissionToCsvRow(d).map(escapeCsvField).join(","));
  return [header, ...rows].join("\n");
}
