import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SurveySubmission } from "@/types/survey";
import { getQuestionById } from "@/config/surveyQuestions";

function channelLabel(value: string | null): string {
  if (!value) return "—";
  const opt = getQuestionById("q1_purchase_channel")?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

export function ResponseTable({ submissions }: { submissions: SurveySubmission[] }) {
  if (submissions.length === 0) {
    return <p className="p-6 text-sm text-stone-500">No responses match these filters yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Purchase Channel</TableHead>
          <TableHead className="text-right">View</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="whitespace-nowrap text-stone-500">
              {new Date(s.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {s.completed_at ? (
                <Badge variant="success">Completed</Badge>
              ) : (
                <Badge variant="secondary">In progress</Badge>
              )}
            </TableCell>
            <TableCell>{channelLabel(s.purchase_channel)}</TableCell>
            <TableCell className="text-right">
              <Link href={`/admin/responses/${s.id}`} className="font-medium text-amber-700 hover:underline">
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
