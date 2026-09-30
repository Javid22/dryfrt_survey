import { createClient } from "@/lib/supabase/server";
import { getAllAnswers, getAllSubmissions } from "@/lib/db/submissions";
import { CustomerVoice, type VoiceEntry } from "@/components/admin/CustomerVoice";
import { getQuestionById } from "@/config/surveyQuestions";

export const dynamic = "force-dynamic";

const VOICE_QUESTION_IDS = ["improvement_feedback"];

export default async function CustomerVoicePage() {
  const supabase = await createClient();
  const [submissions, answers] = await Promise.all([
    getAllSubmissions(supabase),
    getAllAnswers(supabase),
  ]);

  const submissionById = new Map(submissions.map((s) => [s.id, s]));

  const entries: VoiceEntry[] = answers
    .filter((a) => VOICE_QUESTION_IDS.includes(a.question_id) && a.answer_text)
    .map((a) => {
      const submission = submissionById.get(a.submission_id);
      return {
        submissionId: a.submission_id,
        questionId: a.question_id,
        questionTitle: getQuestionById(a.question_id)?.title ?? a.question_id,
        text: a.answer_text as string,
        area: submission?.area ?? null,
        purchaseChannel: submission?.purchase_channel ?? null,
        date: submission?.created_at ?? a.created_at,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Customer Voice</h1>
        <p className="text-stone-500">Open-ended qualitative feedback from respondents.</p>
      </div>
      <CustomerVoice entries={entries} />
    </div>
  );
}
