import { createClient } from "@/lib/supabase/server";
import { getAllAnswers, getAllSubmissions } from "@/lib/db/submissions";
import {
  competitorRanking,
  customisationDemand,
  desiredFeatures,
  filterByArea,
  giftingDemand,
  purchaseChannelBreakdown,
  topProblems,
  topPurchaseReasons,
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

  const submissions = filterByArea(allSubmissions, area);
  const submissionIds = new Set(submissions.map((s) => s.id));

  const channel = purchaseChannelBreakdown(submissions);
  const reasons = topPurchaseReasons(allAnswers, submissionIds);
  const problems = topProblems(allAnswers, submissionIds);
  const features = desiredFeatures(allAnswers, submissionIds);
  const gifting = giftingDemand(allAnswers, submissionIds);
  const customisation = customisationDemand(allAnswers, submissionIds);
  const competitors = competitorRanking(submissions);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>
          <p className="text-stone-500">
            {submissions.length} response{submissions.length === 1 ? "" : "s"}
            {area !== "All Areas" ? ` in ${area}` : ""}.
          </p>
        </div>
        <AreaFilter />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Purchase Channel" description="Where respondents currently buy from.">
          <AnalyticsPieChart data={channel} />
        </ChartCard>
        <ChartCard title="Top Purchase Reasons" description="Why they choose their current seller.">
          <AnalyticsBarChart data={reasons} />
        </ChartCard>
        <ChartCard title="Top Problems" description="What respondents dislike today.">
          <AnalyticsBarChart data={problems} />
        </ChartCard>
        <ChartCard title="Desired Features" description="What an ideal store would offer.">
          <AnalyticsBarChart data={features} />
        </ChartCard>
        <ChartCard title="Gifting Demand" description="Services respondents are interested in.">
          <AnalyticsBarChart data={gifting} />
        </ChartCard>
        <ChartCard title="Customisation Demand" description="What people want to customise.">
          <AnalyticsBarChart data={customisation} />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where Customers Currently Buy</CardTitle>
          <CardDescription>
            Ranked from Q2 store/website names, normalized for common spelling variants (e.g.
            &quot;Amazon.in&quot; → &quot;Amazon&quot;). Admins can extend the normalization map in
            <code className="mx-1 rounded bg-stone-100 px-1 py-0.5 text-xs">
              src/lib/analytics/normalizeStoreName.ts
            </code>
            for names it doesn&apos;t recognize yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="text-sm text-stone-500">No store/website names recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {competitors.slice(0, 15).map((c, idx) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-stone-700">
                    <span className="mr-2 text-stone-400">{idx + 1}.</span>
                    {c.name}
                  </span>
                  <span className="font-semibold text-stone-900">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
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
