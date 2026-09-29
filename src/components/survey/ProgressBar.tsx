import { Progress } from "@/components/ui/progress";

type ProgressBarProps = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-stone-500">
        <span>
          Question {currentStep} of {totalSteps}
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} aria-label="Survey progress" />
    </div>
  );
}
