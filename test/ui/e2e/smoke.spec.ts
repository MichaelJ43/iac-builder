import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const minimalWizard = path.join(__dirname, "fixtures", "minimal-wizard.json");

test("wizard shows framework step", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "iac-builder" })).toBeVisible();
  await expect(page.getByText("IaC framework")).toBeVisible();
});

test("can open code slider", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show code" }).click();
  await expect(page.getByRole("button", { name: "Hide code" })).toBeVisible();
});

test("export configuration triggers a JSON download", async ({ page }) => {
  await page.goto("/");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export configuration" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("iac-builder-wizard.json");
});

test("import configuration from JSON fills the wizard", async ({ page }) => {
  await page.goto("/");
  await page.locator("#wizard-import-file").setInputFiles(minimalWizard);
  await expect(page.getByRole("combobox", { name: "IaC framework" })).toHaveValue("terraform");
  await expect(page.getByPlaceholder("us-east-1")).toHaveValue("us-east-1");
  await expect(page.getByPlaceholder("subnet-...")).toHaveValue("subnet-test123");
});
