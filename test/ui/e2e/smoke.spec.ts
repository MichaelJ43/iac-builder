import { test, expect } from "@playwright/test";

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
