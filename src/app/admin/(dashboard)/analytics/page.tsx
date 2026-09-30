import { createClient } from "@/lib/supabase/server";
import { getAllAnswers, getAllSubmissions } from "@/lib/db/submissions";
import {
  filterByArea,
  filterCompleted,
  monthlyBudgetBreakdown,
  purchaseChannelBreakdown,
  purchaseFrequencyBreakdown,
  topPriorities,
} from "@/lib/analytics/aggregate";
import { AreaFilter } from "@/components/admin/Filters";
import { AnalyticsBarChart, AnalyticsPieChart } from "@/components/admin/AnalyticsChart";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area = "All Areas" } = await searchParams;
  const supabase = await createClient();
  const [allSubmissions, allAnswers] = await Promise.all([
    getAllSubmissions(supabase),
    getAllAnswers(supabase),
  ]);

  // Charts represent finished surveys only — in-progress drafts (visible on
  // the Dashboard/Responses pages) would otherwise skew these breakdowns.
  const submissions = filterCompleted(filterByArea(allSubmissions, area));
  const submissionIds = new Set(submissions.map((s) => s.id));

  const channel = purchaseChannelBreakdown(submissions);
  const priorities = topPriorities(allAnswers, submissionIds);
  const budget = monthlyBudgetBreakdown(allAnswers, submissionIds);
  const frequency = purchaseFrequencyBreakdown(allAnswers, submissionIds);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>
          <p className="text-stone-500">
            {submissions.length} completed response{submissions.length === 1 ? "" : "s"}
            {area !== "All Areas" ? ` in ${area}` : ""}.
          </p>
        </div>
        <AreaFilter />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Purchase Channel" description="Where respondents currently buy from.">
          <AnalyticsPieChart data={channel} />
        </ChartCard>
        <ChartCard title="What Matters Most" description="Top reasons for choosing where they buy (up to 3 each).">
          <AnalyticsBarChart data={priorities} />
        </ChartCard>
        <ChartCard title="Monthly Budget" description="Monthly spend on dry fruits.">
          <AnalyticsBarChart data={budget} />
        </ChartCard>
        <ChartCard title="Purchase Frequency" description="How often respondents buy dry fruits.">
          <AnalyticsPieChart data={frequency} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
