import { describeAuthSuite as describeAuth, expect, test } from "./use-authed";

describeAuth("Навигация (сессия)", () => {
  test("клиентский shell: доски, аккаунт, настройки, /app → /boards", async ({ page }) => {
    await page.goto("/boards");
    await expect(page.locator("#boards-list-heading")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link", { name: "Личный кабинет" })
      .click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.locator("#profile-heading")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link", { name: "Настройки" })
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("#appearance-heading")).toBeVisible();

    await page.getByRole("navigation", { name: "Основная навигация" }).getByRole("link", { name: "Доски" }).click();
    await expect(page).toHaveURL(/\/boards/);

    await page.goto("/app");
    await expect(page).toHaveURL(/\/boards\/?$/);
  });
});
