import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavigationButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
};

export function NavigationButtons({
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  isSubmitting,
}: NavigationButtonsProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        className="flex-1 sm:flex-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <Button
        type="button"
        size="lg"
        onClick={onNext}
        disabled={isSubmitting}
        className="flex-1 sm:flex-none"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : isLastStep ? (
          "Submit Survey"
        ) : (
          <>
            Next
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
