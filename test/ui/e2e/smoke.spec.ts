import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const minimalWizard = path.join(__dirname, "fixtures", "minimal-wizard.json");

test("wizard shows framework step", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "iac-builder" })).toBeVisible();
  await expect(page.getByText("IaC framework", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("combobox", { name: "AWS region" })).toHaveValue("us-east-1");
  await expect(page.getByRole("combobox", { name: "Subnet ID" })).toHaveValue("subnet-test123");
});

test("bundled starter template loads into the form", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Bundled starter template").selectOption("terraform-us-east-1-skeleton");
  await page.getByRole("button", { name: "Load starter" }).click();
  await expect(page.getByRole("combobox", { name: "IaC framework" })).toHaveValue("terraform");
  await expect(page.getByRole("combobox", { name: "AWS region" })).toHaveValue("us-east-1");
  await expect(page.getByRole("combobox", { name: "Subnet ID" })).toHaveValue("subnet-0replace00000000");
});

test("AI assist policy panel is available when build flag is on", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /show optional AI assist/i }).click();
  await expect(
    page.getByRole("region", { name: "AI assist policy and context" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Get AI suggestions" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I have read the policy/i }).check();
  await page.getByRole("button", { name: "Get AI suggestions" }).click();
  await expect(
    page.getByText(/No language model is configured on this server/i)
  ).toBeVisible();
});
