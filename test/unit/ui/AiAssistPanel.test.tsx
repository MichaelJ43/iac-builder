/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyWizardState } from "@ui/api";
import { AiAssistPanel } from "@ui/AiAssistPanel";

describe("AiAssistPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            mode: "stub",
            message: "stubbed server message",
            suggestions: "",
          }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("expands to show context preview and keeps CTA disabled until consent", async () => {
    const user = userEvent.setup();
    const state = { ...emptyWizardState(), framework: "terraform", region: "us-east-1" };
    render(<AiAssistPanel state={state} />);

    await user.click(
      screen.getByRole("button", { name: /show optional AI assist \(beta\)/i })
    );
    expect(await screen.findByText(/Context preview/i)).toBeTruthy();
    const pre = document.querySelector(".ai-assist__pre");
    expect(pre?.textContent).toContain("terraform");
    expect(pre?.textContent).toContain("iac-builder");
    const cta = screen.getByRole("button", { name: /get AI suggestions/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    const box = screen.getByRole("checkbox", { name: /I have read the policy/i });
    await user.click(box);
    expect(cta.disabled).toBe(false);
  });

  it("posts to the API when consent is given and shows the server message", async () => {
    const user = userEvent.setup();
    const state = { ...emptyWizardState(), framework: "terraform", region: "us-east-1" };
    render(<AiAssistPanel state={state} />);
    await user.click(screen.getByRole("button", { name: /show optional AI assist/i }));
    await user.click(screen.getByRole("checkbox", { name: /I have read the policy/i }));
    await user.click(screen.getByRole("button", { name: /get AI suggestions/i }));
    await waitFor(() => {
      expect(screen.getByText(/stubbed server message/)).toBeTruthy();
    });
    const f = vi.mocked(fetch);
    expect(f).toHaveBeenCalled();
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/api/v1/ai/assist");
    expect(init?.method).toBe("POST");
  });

  it("toggles the consent checkbox", async () => {
    const user = userEvent.setup();
    render(<AiAssistPanel state={emptyWizardState()} />);
    await user.click(
      screen.getByRole("button", { name: /show optional AI assist/i })
    );
    const box = screen.getByRole("checkbox", { name: /I have read the policy/i }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await user.click(box);
    expect(box.checked).toBe(true);
  });
});
