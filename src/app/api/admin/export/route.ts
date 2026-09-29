import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllAnswers, getAllSubmissions } from "@/lib/db/submissions";
import { buildSurveyCsv } from "@/lib/analytics/csv";
import type { SubmissionDetail, SurveyAnswerDbRow } from "@/types/survey";

/**
 * CSV export for admins. Auth-checked here (not just via middleware) since
 * this is an API route, and reads go through the authenticated server
 * client — RLS's `auth.role() = 'authenticated'` policy grants SELECT, so
 * no service role key is used.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [submissions, answers] = await Promise.all([
    getAllSubmissions(supabase),
    getAllAnswers(supabase),
  ]);

  const answersBySubmission = new Map<string, Record<string, SurveyAnswerDbRow>>();
  for (const row of answers) {
    if (!answersBySubmission.has(row.submission_id)) {
      answersBySubmission.set(row.submission_id, {});
    }
    answersBySubmission.get(row.submission_id)![row.question_id] = row;
  }

  const details: SubmissionDetail[] = submissions.map((submission) => ({
    submission,
    answers: answersBySubmission.get(submission.id) ?? {},
  }));

  const csv = buildSurveyCsv(details);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="survey_responses.csv"',
    },
  });
}
