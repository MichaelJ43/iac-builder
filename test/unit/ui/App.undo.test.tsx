/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@ui/App";

describe("App undo toolbar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ files: {}, recommendations: [] }),
        text: async () => "",
      }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enables Undo after edits and restores prior wizard step on click", async () => {
    const user = userEvent.setup();
    render(<App />);

    const undo = screen.getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);

    const framework = screen.getByRole("combobox", { name: /IaC framework/i }) as HTMLSelectElement;
    await user.selectOptions(framework, "terraform");

    const region = screen.getByPlaceholderText("us-east-1") as HTMLInputElement;
    await user.clear(region);
    await user.type(region, "us-east-1");

    await waitFor(() => expect(undo.disabled).toBe(false), { timeout: 3000 });

    await user.click(undo);

    await waitFor(() => expect(framework.value).toBe(""), { timeout: 3000 });
    expect(screen.queryByPlaceholderText("us-east-1")).toBeNull();
  });
});
