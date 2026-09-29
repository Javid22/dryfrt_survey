import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurveyQuestion } from "@/components/survey/SurveyQuestion";
import { getQuestionById } from "@/config/surveyQuestions";

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
    const question = getQuestionById("q3_purchase_reasons")!; // maxSelections: 3

    const { rerender } = render(
      <SurveyQuestion
        question={question}
        value={["price", "freshness", "trust"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    // A 4th option should be silently ignored once 3 are already selected.
    await user.click(screen.getByText("Variety"));
    expect(onChange).not.toHaveBeenCalled();

    // Unchecking one of the selected options should work normally.
    rerender(
      <SurveyQuestion
        question={question}
        value={["price", "freshness", "trust"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );
    await user.click(screen.getByText("Price"));
    expect(onChange).toHaveBeenCalledWith(["freshness", "trust"]);
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

  it("applies exclusive-option behavior for Q9's 'No' option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = getQuestionById("q9_gift_purchase_history")!;

    render(
      <SurveyQuestion
        question={question}
        value={["wedding_engagement"]}
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    await user.click(screen.getByText("No"));
    expect(onChange).toHaveBeenCalledWith(["no"]);
  });

  it("renders a textarea for open-ended questions and reports the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = getQuestionById("q12_owner_suggestion")!;

    render(
      <SurveyQuestion
        question={question}
        value=""
        otherValue=""
        onChange={onChange}
        onOtherChange={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText("Your idea...");
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
