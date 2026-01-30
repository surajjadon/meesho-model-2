import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CropperPage from "../app/(protected)/cropper/page";
import { api } from "@/providers/GlobalProvider";

// ---- mocks ----
jest.mock("@/providers/GlobalProvider", () => ({
  useBusiness: () => ({
    selectedBusiness: { gstin: "22AAAAA0000A1Z5" },
  }),
  api: {
    post: jest.fn(() =>
      Promise.resolve({
        data: {
          results: {
            saved: 1,
            skipped: 0,
            unmappedSkus: [],
            details: [],
            dailyBreakdown: [],
          },
        },
      })
    ),
    get: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    promise: jest.fn(),
  },
}));

jest.mock("@/components/ProtectRoute", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));


//abort controller mock//

const abortMock = jest.fn();

global.AbortController = jest.fn(() => ({
  abort: abortMock,
  signal: {},
})) as any;


// ---- tests ----
describe("CropperPage", () => {
  test("renders upload UI", () => {
    render(<CropperPage />);
    expect(
      screen.getByText(/Process & Sync PDF Labels/i)
    ).toBeInTheDocument();
  });

  test("upload button is disabled without file", () => {
    render(<CropperPage />);
    const button = screen.getByRole("button", {
      name: /Process PDF/i,
    });
    expect(button).toBeDisabled();
  });

  test("shows file name after selecting PDF", async () => {
    render(<CropperPage />);

    const file = new File(["data"], "label.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByLabelText(/upload pdf label/i);
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(await screen.findByText("label.pdf")).toBeInTheDocument();
  });

  test("does NOT call API if schema validation fails", async () => {
    render(<CropperPage />);

    const file = new File(["data"], "label.txt", {
      type: "text/plain",
    });

    fireEvent.change(screen.getByLabelText(/upload pdf label/i), {
      target: { files: [file] },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Process PDF/i })
    );

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  test("calls API when valid PDF is uploaded", async () => {
    render(<CropperPage />);

    const file = new File(["data"], "label.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText(/upload pdf label/i), {
      target: { files: [file] },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Process PDF/i })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  test("shows loading state during upload", () => {
    render(<CropperPage />);

    const file = new File(["data"], "label.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText(/upload pdf label/i), {
      target: { files: [file] },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Process PDF/i })
    );

    expect(
      screen.getByText(/Processing Labels/i)
    ).toBeInTheDocument();
  });

  test("aborts previous upload when new upload starts", async () => {
  render(<CropperPage />);

  const file1 = new File(["a"], "one.pdf", { type: "application/pdf" });
  const file2 = new File(["b"], "two.pdf", { type: "application/pdf" });

  const input = screen.getByLabelText(/upload pdf label/i);
  const button = screen.getByRole("button", { name: /Process PDF/i });

  // First upload
  fireEvent.change(input, { target: { files: [file1] } });
  fireEvent.click(button);

  // Second upload triggers abort
  fireEvent.change(input, { target: { files: [file2] } });
  fireEvent.click(button);

  await waitFor(() => {
    expect(abortMock).toHaveBeenCalled();
  });
});

});
