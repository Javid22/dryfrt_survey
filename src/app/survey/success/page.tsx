import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareSurveyButton } from "@/components/survey/ShareSurveyButton";

export const metadata = {
  title: "Thank You — Dry Fruit Customer Research",
};

export default function SurveySuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          <h1 className="text-2xl font-bold text-stone-900">Thank You!</h1>
          <p className="text-stone-600">
            Your feedback has been recorded. Your experience will help us understand what
            customers actually want. Thank you for spending a few minutes with us.
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/">Done</Link>
            </Button>
            <ShareSurveyButton />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
