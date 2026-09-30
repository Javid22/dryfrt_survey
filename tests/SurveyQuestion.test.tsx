import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurveyQuestion } from "@/components/survey/SurveyQuestion";
import { getQuestionById } from "@/config/surveyQuestions";
import type { SurveyQuestion as SurveyQuestionConfig } from "@/types/survey";

describe("SurveyQuestion", () => {
  it("renders single-choice options and calls onChange with the selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = getQuestionById("q1_purchase_channel")!;

    render(
      <SurveyQuestion
        question={question}
        value={undefined}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    await user.click(screen.getByText("Local dry-fruit shop"));
    expect(onChange).toHaveBeenCalledWith("local_shop");
  });

  it("enforces maxSelections on a multi-select question", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = getQuestionById("top_priorities")!; // maxSelections: 3

    const { rerender } = render(
      <SurveyQuestion
        question={question}
        value={["price", "quality", "trust"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    // A 4th option should be silently ignored once 3 are already selected.
    await user.click(screen.getByText("Easy to reach"));
    expect(onChange).not.toHaveBeenCalled();

    // Unchecking one of the selected options should work normally.
    rerender(
      <SurveyQuestion
        question={question}
        value={["price", "quality", "trust"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );
    await user.click(screen.getByText("Low price"));
    expect(onChange).toHaveBeenCalledWith(["quality", "trust"]);
  });

  it("shows a free-text field when 'Other' is selected for an allowOther question", () => {
    const question = getQuestionById("q1_purchase_channel")!;
    render(
      <SurveyQuestion
        question={question}
        value="other"
        otherValue=""
        onChange={vi.fn()}
        onOtherChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Tell us more...")).toBeInTheDocument();
  });

  it("applies exclusive-option behavior for a question's 'None' option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question: SurveyQuestionConfig = {
      id: "test_exclusive",
      title: "Test exclusive option",
      type: "multiple",
      exclusiveOptionValue: "none",
      options: [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
        { value: "none", label: "None" },
      ],
    };

    render(
      <SurveyQuestion
        question={question}
        value={["a"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    await user.click(screen.getByText("None"));
    expect(onChange).toHaveBeenCalledWith(["none"]);
  });

  it("renders a textarea for open-ended questions and reports the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = getQuestionById("improvement_feedback")!;

    render(
      <SurveyQuestion
        question={question}
        value=""
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText("Tell us here...");
    await user.type(textarea, "Hi");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows a validation error message when provided", () => {
    const question = getQuestionById("q1_purchase_channel")!;
    render(
      <SurveyQuestion
        question={question}
        value={undefined}
        otherValue=""
        onChange={vi.fn()}
        onOtherChange={vi.fn()}
        error="Please choose an option."
      />
    );
    expect(screen.getByText("Please choose an option.")).toBeInTheDocument();
  });
});
