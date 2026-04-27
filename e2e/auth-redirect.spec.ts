import { expect, test } from "@playwright/test";

test.describe("Редирект гостя", () => {
  test("доступ к /boards ведёт на /sign-in", async ({ page }) => {
    await page.goto("/boards");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
