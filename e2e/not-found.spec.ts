import { expect, test } from "@playwright/test";

test.describe("404", () => {
  test("неизвестный путь", async ({ page }) => {
    await page.goto("/e2e-missing-page-xyz");
    await expect(page.getByText("404", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  });
});
