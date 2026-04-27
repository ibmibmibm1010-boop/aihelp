import { expect, test } from "@playwright/test";

test.describe("Лендинг (гость)", () => {
  test("есть ссылки на вход и регистрацию", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Войти", exact: true })).toHaveAttribute("href", "/sign-in");
    await expect(page.getByRole("link", { name: "Регистрация" })).toHaveAttribute("href", "/sign-up");
  });
});
