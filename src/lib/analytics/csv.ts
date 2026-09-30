import type { SubmissionDetail } from "@/types/survey";

export const CSV_COLUMNS = [
  "Submission ID",
  "Date",
  "Purchase channel",
  "What matters most",
  "Monthly budget",
  "Purchase frequency",
  "Feedback",
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
    submission.purchase_channel ?? "",
    joinMulti(jsonOf(detail, "top_priorities")),
    textOf(detail, "monthly_budget"),
    textOf(detail, "purchase_frequency"),
    textOf(detail, "improvement_feedback"),
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
