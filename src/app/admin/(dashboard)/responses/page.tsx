import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllSubmissions } from "@/lib/db/submissions";
import { filterByArea } from "@/lib/analytics/aggregate";
import { AreaFilter } from "@/components/admin/Filters";
import { ResponseTable } from "@/components/admin/ResponseTable";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area = "All Areas" } = await searchParams;
  const supabase = await createClient();
  const allSubmissions = await getAllSubmissions(supabase);
  const submissions = filterByArea(allSubmissions, area);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Responses</h1>
          <p className="text-stone-500">
            {submissions.length} total (completed and in-progress).
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AreaFilter />
          <a
            href="/api/admin/export"
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
      </div>

      <Card className="p-0">
        <ResponseTable submissions={submissions} />
      </Card>
    </div>
  );
}
