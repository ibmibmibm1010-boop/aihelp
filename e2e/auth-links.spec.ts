import { expect, test } from "@playwright/test";

test.describe("Ссылки вход ↔ регистрация (гость)", () => {
  test("со страницы входа — на регистрацию", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Зарегистрироваться", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("со страницы регистрации — на вход", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("link", { name: "Войти", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});
