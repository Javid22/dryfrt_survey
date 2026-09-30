import { Users, CheckCircle2, Store, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAllAnswers, getAllSubmissions } from "@/lib/db/submissions";
import { computeDashboardStats, purchaseChannelBreakdown } from "@/lib/analytics/aggregate";
import { DashboardCard } from "@/components/admin/DashboardCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [submissions, answers] = await Promise.all([
    getAllSubmissions(supabase),
    getAllAnswers(supabase),
  ]);

  const stats = computeDashboardStats(submissions, answers);
  const channelBreakdown = purchaseChannelBreakdown(submissions).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500">
          Live snapshot of the customer research survey — includes in-progress drafts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <DashboardCard label="Total Responses" value={stats.totalResponses} icon={Users} accent="amber" />
        <DashboardCard
          label="Completed"
          value={stats.completedResponses}
          icon={CheckCircle2}
          accent="emerald"
        />
        <DashboardCard
          label="Offline Buyers"
          value={`${stats.offlineBuyerPct}%`}
          icon={Store}
          accent="sky"
        />
        <DashboardCard
          label="Online Buyers"
          value={`${stats.onlineBuyerPct}%`}
          icon={Globe}
          accent="emerald"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Channels</CardTitle>
        </CardHeader>
        <CardContent>
          {channelBreakdown.length === 0 ? (
            <p className="text-sm text-stone-500">No responses yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {channelBreakdown.map((c) => (
                <li key={c.value} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700">{c.label}</span>
                  <span className="font-semibold text-stone-900">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
