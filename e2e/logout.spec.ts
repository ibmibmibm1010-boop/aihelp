import { describeAuthSuite as describeAuth, expect, test } from "./use-authed";

describeAuth("Выход", () => {
  test("выйти и снова требуется вход для /boards", async ({ page }) => {
    await page.goto("/boards");
    await expect(page.locator("#boards-list-heading")).toBeVisible();

    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page.getByRole("link", { name: "Войти", exact: true })).toBeVisible({ timeout: 15_000 });

    await page.goto("/boards");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
