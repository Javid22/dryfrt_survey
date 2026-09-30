import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubmissionDetail } from "@/lib/db/submissions";
import { CORE_QUESTIONS, DEMOGRAPHIC_QUESTIONS } from "@/config/surveyQuestions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function renderAnswer(answerText: string | null, answerJson: string[] | null, questionId: string, optionLookup: (qid: string, v: string) => string) {
  if (answerJson && answerJson.length > 0) {
    return (
      <div className="flex flex-wrap gap-2">
        {answerJson.map((v) => (
          <Badge key={v}>{optionLookup(questionId, v)}</Badge>
        ))}
      </div>
    );
  }
  if (answerText) {
    return <p className="whitespace-pre-wrap text-stone-800">{answerText}</p>;
  }
  return <p className="text-stone-400">No answer</p>;
}

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await getSubmissionDetail(supabase, id);

  if (!detail) notFound();

  const { submission, answers } = detail;

  function optionLookup(questionId: string, value: string) {
    const q = [...CORE_QUESTIONS, ...DEMOGRAPHIC_QUESTIONS].find((q) => q.id === questionId);
    return q?.options?.find((o) => o.value === value)?.label ?? value;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/responses" className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to responses
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Submission {submission.id.slice(0, 8)}</CardTitle>
            {submission.completed_at ? (
              <Badge variant="success">Completed</Badge>
            ) : (
              <Badge variant="secondary">In progress</Badge>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {new Date(submission.created_at).toLocaleString()} · Survey {submission.survey_version}
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Info label="Area" value={submission.area ?? "—"} />
          <Info label="Age group" value={submission.age_group ?? "—"} />
          <Info label="Purchase frequency" value={submission.purchase_frequency ?? "—"} />
          <Info label="Channel" value={submission.purchase_channel ?? "—"} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {CORE_QUESTIONS.map((q) => {
          const row = answers[q.id];
          return (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">{q.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {renderAnswer(row?.answer_text ?? null, row?.answer_json ?? null, q.id, optionLookup)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="font-medium text-stone-800">{value}</p>
    </div>
  );
}
