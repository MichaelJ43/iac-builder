/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@ui/App";
import { STARTER_TEMPLATES } from "@ui/starterCatalog";

describe("App starter template", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ files: { "main.tf": "resource" }, recommendations: [] }),
        text: async () => "",
      }))
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("load starter applies a bundled template to the form", async () => {
    const user = userEvent.setup();
    render(<App />);
    const pick = screen.getByRole("combobox", { name: /bundled starter template/i }) as HTMLSelectElement;
    const firstId = STARTER_TEMPLATES[0]!.id;
    await user.selectOptions(pick, firstId);
    await user.click(screen.getByRole("button", { name: /^load starter$/i }));
    const framework = screen.getByRole("combobox", { name: /IaC framework/i }) as HTMLSelectElement;
    await waitFor(() => expect(framework.value).toBe("terraform"));
    expect((screen.getByPlaceholderText("us-east-1") as HTMLInputElement).value).toBe("us-east-1");
  });
});
