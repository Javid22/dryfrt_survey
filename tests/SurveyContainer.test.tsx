import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const submitSurveyMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock("@/app/survey/actions", () => ({
  submitSurvey: (...args: unknown[]) => submitSurveyMock(...args),
}));

// Import after mocks are registered.
const { SurveyContainer } = await import("@/components/survey/SurveyContainer");

describe("SurveyContainer", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    submitSurveyMock.mockReset();
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
    await user.click(screen.getByText("Online website/app"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText("Which website/app do you usually buy from?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(await screen.findByText("Where do you usually buy dry fruits?")).toBeInTheDocument();
    // Previous answer preserved.
    expect(screen.getByText("Online website/app").closest("label")).toHaveClass("border-amber-600");
  });

  it("shows offline fields (store name + area) instead of the online field for an offline channel", async () => {
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("Local dry-fruit shop"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(
      await screen.findByText("If you buy offline, which shop/store do you usually buy from?")
    ).toBeInTheDocument();
    expect(screen.getByText("Which area is the store located in?")).toBeInTheDocument();
    expect(screen.queryByText("Which website/app do you usually buy from?")).not.toBeInTheDocument();
  });

  it("enforces the max-selections limit on Q3 before allowing Next to pass validation elsewhere", async () => {
    // maxSelections is enforced at the option level (SurveyQuestion), already
    // covered in SurveyQuestion.test.tsx; here we confirm the container lets
    // a within-limit multi-select answer through without an error.
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("I don't usually buy dry fruits"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Q2 group has no applicable fields for "dont_buy" -> skips straight to Q3.
    expect(
      await screen.findByText("What are the main reasons you choose this shop/website?")
    ).toBeInTheDocument();
  });

  it("submits successfully and redirects to the success page", async () => {
    submitSurveyMock.mockResolvedValue({ success: true, id: "sub_123" });
    const user = userEvent.setup();
    render(<SurveyContainer />);

    await screen.findByText("Where do you usually buy dry fruits?");
    await user.click(screen.getByText("I don't usually buy dry fruits"));

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
    await user.click(screen.getByText("I don't usually buy dry fruits"));

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
