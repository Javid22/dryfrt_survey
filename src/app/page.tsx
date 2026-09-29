import Link from "next/link";
import { ArrowRight, Clock3, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 via-stone-50 to-stone-50 px-4 py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl">
          🌰
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
            Help Us Understand How You Buy Dry Fruits
          </h1>
          <p className="text-lg text-stone-600">
            We&apos;re doing a short customer research survey to understand how people really buy
            dry fruits — what they like, what they don&apos;t like, and what could be improved.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-amber-800">
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2">
            <Clock3 className="h-4 w-4" /> 3–4 minutes
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2">
            <Sparkles className="h-4 w-4" /> No right or wrong answers
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2">
            <Heart className="h-4 w-4" /> Your honest experience matters
          </span>
        </div>

        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/survey">
            Start Survey <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>

        <p className="text-xs text-stone-400">
          Your responses are anonymous and used only for research purposes.
        </p>
      </div>
    </main>
  );
}
