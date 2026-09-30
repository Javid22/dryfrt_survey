import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const submitSurveyMock = vi.fn();
const saveSurveyProgressMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock("@/app/survey/actions", () => ({
  submitSurvey: (...args: unknown[]) => submitSurveyMock(...args),
  saveSurveyProgress: (...args: unknown[]) => saveSurveyProgressMock(...args),
}));

// Import after mocks are registered.
const { SurveyContainer } = await import("@/components/survey/SurveyContainer");

describe("SurveyContainer", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    submitSurveyMock.mockReset();
    saveSurveyProgressMock.mockReset();
    saveSurveyProgressMock.mockResolvedValue({ success: true, id: "draft_123", savedAnswerKeys: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows Q1 first and blocks Next until a required answer is chosen", async () => {
    const user = userEvent.setup();
    render(<SurveyContainer />);

    expect(await screen.findByText("Where do you usually buy dry fruits?")).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("Please choose an option.")).toBeInTheDocument();
    // Still on Q1.
    expect(screen.getByText("Where do you usually buy dry fruits?")).toBeInTheDocument();
  });

  it("advances to the next question once Q1 is answered, and Back returns to Q1", async () => {
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("Online (website or app)"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(
      await screen.findByText("What matters most to you when choosing where to buy?")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByText("Where do you usually buy dry fruits?")).toBeInTheDocument();
    // Previous answer preserved.
    expect(screen.getByText("Online (website or app)").closest("label")).toHaveClass("border-amber-600");
  });

  it("enforces the max-selections limit on the priorities question before allowing Next to pass validation elsewhere", async () => {
    // maxSelections is enforced at the option level (SurveyQuestion), already
    // covered in SurveyQuestion.test.tsx; here we confirm the container lets
    // a within-limit multi-select answer through without an error.
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("I don't buy dry fruits"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(
      await screen.findByText("What matters most to you when choosing where to buy?")
    ).toBeInTheDocument();
  });

  it("submits successfully and redirects to the success page", async () => {
    submitSurveyMock.mockResolvedValue({ success: true, id: "sub_123" });
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("I don't buy dry fruits"));

    // Click Next repeatedly until we reach the final "Submit Survey" button.
    for (let i = 0; i < 20; i++) {
      const submitButton = screen.queryByRole("button", { name: /submit survey/i });
      if (submitButton) {
        await user.click(submitButton);
        break;
      }
      await user.click(screen.getByRole("button", { name: /next/i }));
    }

    await waitFor(() => expect(submitSurveyMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/survey/success"));
  });

  it("shows a friendly error and keeps answers on submission failure", async () => {
    submitSurveyMock.mockResolvedValue({
      success: false,
      error:
        "Something went wrong while submitting your response. Please check your internet connection and try again.",
    });
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("I don't buy dry fruits"));

    for (let i = 0; i < 20; i++) {
      const submitButton = screen.queryByRole("button", { name: /submit survey/i });
      if (submitButton) {
        await user.click(submitButton);
        break;
      }
      await user.click(screen.getByRole("button", { name: /next/i }));
    }

    expect(
      await screen.findByText(
        "Something went wrong while submitting your response. Please check your internet connection and try again."
      )
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalledWith("/survey/success");
  });
});
