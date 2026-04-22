/** @vitest-environment jsdom */
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emptyWizardState } from "@ui/api";
import { AiAssistPanel } from "@ui/AiAssistPanel";

afterEach(() => {
  cleanup();
});

describe("AiAssistPanel", () => {
  it("expands to show context preview and keeps suggestions disabled", async () => {
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
