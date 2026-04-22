/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@ui/App";
import { buildWizardExport, stringifyExport } from "@ui/wizardExportImport";
import { emptyWizardState } from "@ui/api";

describe("App import configuration", () => {
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

  it("applies wizard state from a valid JSON file", async () => {
    const user = userEvent.setup();
    render(<App />);

    const exportBody = stringifyExport(
      buildWizardExport({
        ...emptyWizardState(),
        framework: "terraform",
        region: "us-east-1",
        subnet_id: "subnet-1",
        instance_type: "t3.micro",
        ami: "ami-xyz",
      })
    );
    const file = new File([exportBody], "wizard.json", { type: "application/json" });

    const input = document.getElementById("wizard-import-file") as HTMLInputElement;
    await user.upload(input, file);

    const framework = screen.getByRole("combobox", { name: /IaC framework/i }) as HTMLSelectElement;
    await waitFor(() => expect(framework.value).toBe("terraform"));
    expect((screen.getByPlaceholderText("us-east-1") as HTMLInputElement).value).toBe("us-east-1");
  });

  it("shows a clear error for invalid import JSON", async () => {
    const user = userEvent.setup();
    render(<App />);
    const file = new File(["{broken"], "bad.json", { type: "application/json" });
    const input = document.getElementById("wizard-import-file") as HTMLInputElement;
    await user.upload(input, file);
    expect(await screen.findByText(/valid JSON/i)).toBeTruthy();
  });
});
