import { expect, test } from "@playwright/test";

test.describe("OAuth callback (гость)", () => {
  test("без сессии /auth/callback уводит на /sign-in", async ({ page }) => {
    test.setTimeout(20_000);

    await page.goto("/auth/callback");
    await expect(page.getByText("Завершаем вход…", { exact: true })).toBeVisible();

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 16_000 });
  });
});
