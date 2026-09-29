import { SurveyContainer } from "@/components/survey/SurveyContainer";

export const metadata = {
  title: "Survey — Dry Fruit Customer Research",
};

export default function SurveyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50 px-4 py-10 sm:py-16">
      <SurveyContainer />
    </main>
  );
}
