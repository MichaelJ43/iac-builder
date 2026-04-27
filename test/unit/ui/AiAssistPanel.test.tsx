/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyWizardState } from "@ui/api";
import { AiAssistPanel } from "@ui/AiAssistPanel";

describe("AiAssistPanel", () => {
  const auth = { kind: "disabled" as const };

  beforeEach(() => {
    const impl = (url: string | URL) => {
      const u = String(url);
      if (u.includes("/api/v1/ai/openai-key")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ configured: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: true,
            mode: "stub",
            message: "stubbed server message",
            suggestions: "",
          }),
      });
    };
    vi.stubGlobal("fetch", vi.fn(impl));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("expands to show context preview and keeps CTA disabled until consent", async () => {
    const user = userEvent.setup();
    const state = { ...emptyWizardState(), framework: "terraform", region: "us-east-1" };
    render(<AiAssistPanel state={state} authStatus={auth} />);

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
    render(<AiAssistPanel state={state} authStatus={auth} />);
    await user.click(screen.getByRole("button", { name: /show optional AI assist/i }));
    await user.click(screen.getByRole("checkbox", { name: /I have read the policy/i }));
    await user.click(screen.getByRole("button", { name: /get AI suggestions/i }));
    await waitFor(() => {
      expect(screen.getByText(/stubbed server message/)).toBeTruthy();
    });
    const f = vi.mocked(window.fetch);
    const assistCall = f.mock.calls.find((c) => String(c[0]).includes("/api/v1/ai/assist"));
    expect(assistCall).toBeTruthy();
    expect((assistCall![1] as RequestInit | undefined)?.method).toBe("POST");
  });

  it("toggles the consent checkbox", async () => {
    const user = userEvent.setup();
    render(<AiAssistPanel state={emptyWizardState()} authStatus={auth} />);
    await user.click(
      screen.getByRole("button", { name: /show optional AI assist/i })
    );
    const box = screen.getByRole("checkbox", { name: /I have read the policy/i }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    await user.click(box);
    expect(box.checked).toBe(true);
  });
});
