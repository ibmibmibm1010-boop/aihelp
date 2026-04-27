import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL?.trim() ?? "e2e-check@example.com";

test.describe("Вход: ошибки", () => {
  test("неверный пароль — сообщение и остаёмся на /sign-in", async ({ page }) => {
    await page.goto("/sign-in");
    await page.locator("#signin-email").fill(email);
    await page.locator("#signin-password").fill("___wrong_password_for_e2e___");
    await page
      .locator("form")
      .filter({ has: page.locator("#signin-email") })
      .locator('button[type="submit"]')
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  });
});
