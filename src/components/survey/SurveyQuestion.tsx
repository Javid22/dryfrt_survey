"use client";

import type { SurveyQuestion as SurveyQuestionConfig } from "@/types/survey";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SurveyQuestionProps = {
  question: SurveyQuestionConfig;
  value: string | string[] | undefined;
  otherValue: string;
  onChange: (value: string | string[]) => void;
  onOtherChange: (value: string) => void;
  error?: string;
};

export function SurveyQuestion({
  question,
  value,
  otherValue,
  onChange,
  onOtherChange,
  error,
}: SurveyQuestionProps) {
  const showOtherInput =
    question.allowOther &&
    ((question.type === "single" && value === "other") ||
      (question.type === "multiple" && Array.isArray(value) && value.includes("other")));

  /** Drops a tapped suggestion into the current text, rather than replacing it, so tapping more than one still makes sense. */
  function applySuggestion(phrase: string) {
    const current = typeof value === "string" ? value.trim() : "";
    if (!current) {
      onChange(phrase);
      return;
    }
    if (current.toLowerCase().includes(phrase.toLowerCase())) return; // already there
    onChange(`${current}, ${phrase}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 sm:text-2xl">{question.title}</h2>
        {question.description && (
          <p className="mt-1.5 text-sm text-stone-500">{question.description}</p>
        )}
      </div>

      {question.type === "single" && question.options && (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(v)}
        >
          {question.options.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`${question.id}-${opt.value}`}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-colors",
                value === opt.value
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"
              )}
            >
              <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      )}

      {question.type === "multiple" && question.options && (
        <div className="grid gap-3">
          {question.options.map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(opt.value);
            return (
              <label
                key={opt.value}
                htmlFor={`${question.id}-${opt.value}`}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-medium transition-colors",
                  checked
                    ? "border-amber-600 bg-amber-50 text-amber-900"
                    : "border-stone-200 bg-white text-stone-700 hover:border-amber-300"
                )}
              >
                <Checkbox
                  id={`${question.id}-${opt.value}`}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const nextChecked = isChecked === true;
                    let next: string[];
                    if (question.exclusiveOptionValue) {
                      if (opt.value === question.exclusiveOptionValue) {
                        next = nextChecked ? [opt.value] : [];
                      } else {
                        const withoutExclusive = arr.filter(
                          (v) => v !== question.exclusiveOptionValue
                        );
                        next = nextChecked
                          ? [...withoutExclusive, opt.value]
                          : withoutExclusive.filter((v) => v !== opt.value);
                      }
                    } else {
                      next = nextChecked
                        ? [...arr, opt.value]
                        : arr.filter((v) => v !== opt.value);
                    }
                    if (
                      question.maxSelections &&
                      next.length > question.maxSelections
                    ) {
                      return; // silently ignore extra selections beyond the max
                    }
                    onChange(next);
                  }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}

      {showOtherInput && (
        <div className="pl-1">
          <Label htmlFor={`${question.id}-other-text`} className="mb-1.5 block">
            Please specify
          </Label>
          <Input
            id={`${question.id}-other-text`}
            value={otherValue}
            maxLength={300}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Tell us more..."
          />
        </div>
      )}

      {(question.type === "text" || question.type === "textarea") &&
        question.suggestions &&
        question.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {question.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

      {question.type === "text" && (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength ?? 300}
        />
      )}

      {question.type === "textarea" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength ?? 1000}
          rows={5}
        />
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
