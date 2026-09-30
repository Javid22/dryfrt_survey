import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavigationButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
  /** True while an intermediate step's answers are being saved in the background. Disables navigation but doesn't change the button label. */
  isSaving?: boolean;
};

export function NavigationButtons({
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
  isSubmitting,
  isSaving,
}: NavigationButtonsProps) {
  // Only the final submit's network round trip blocks navigation.
  // Intermediate step saves now run in the background (see SurveyContainer's
  // queueProgressSave), so `isSaving` no longer disables Next/Back — it's
  // shown as a small, non-blocking status note instead.
  const disabled = isSubmitting;
  return (
    <div className="mt-8 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={isFirstStep || disabled}
          className="flex-1 sm:flex-none"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          disabled={disabled}
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
      {isSaving && !isSubmitting && (
        <span className="text-xs text-stone-400">Saving your previous answer…</span>
      )}
    </div>
  );
}
