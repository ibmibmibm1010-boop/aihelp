import { expect, test } from "@playwright/test";

test.describe("Регистрация: валидация", () => {
  test("пароль короче 8 символов — поле невалидно, остаёмся на /sign-up", async ({ page }) => {
    await page.goto("/sign-up");
    await page.locator("#signup-username").fill("e2e_user_val");
    await page.locator("#signup-email").fill("e2e-val@example.com");
    await page.locator("#signup-password").fill("1234567");
    await page.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.locator("#signup-password")).toHaveJSProperty("validity.valid", false);
  });
});
