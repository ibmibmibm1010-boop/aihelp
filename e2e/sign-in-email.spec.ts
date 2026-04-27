import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL?.trim();
const password = process.env.E2E_USER_PASSWORD;

test.describe("Вход по email", () => {
  test("успешный вход и переход на /boards", async ({ page }) => {
    test.skip(
      !email || password == null || String(password) === "",
      "Задайте E2E_USER_EMAIL и E2E_USER_PASSWORD (в .env в корне или в окружении).",
    );

    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/sign-in/);

    await page.locator("#signin-email").fill(email!);
    await page.locator("#signin-password").fill(String(password));

    await page.locator("form").filter({ has: page.locator("#signin-email") }).locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/boards\/?$/, { timeout: 30_000 });
    await expect(page.locator("#boards-list-heading")).toBeVisible({ timeout: 15_000 });
  });
});
