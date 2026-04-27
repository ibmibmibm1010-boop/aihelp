import { expect, test } from "@playwright/test";

test.describe("Редирект /app (гость)", () => {
  test("/app не даёт /boards без сессии", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
